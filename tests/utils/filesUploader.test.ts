import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { upload, type UploadResponse } from "@imagekit/react";
import { filesUploader, FilesUploadError } from "@/utils/filesUploader";
import { buildMockUser } from "../mocks/users/factories";
import { server } from "../mocks/server";

vi.mock("@imagekit/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@imagekit/react")>();
  return {
    ...actual,
    upload: vi.fn()
  };
});

/**
 * Suite unitaria y de integración para la utilidad de subida de archivos (`src/utils/filesUploader.tsx`).
 *
 * Propósito:
 *   Verificar el flujo de autorización mediante firmas temporales del backend (`/api/storage/upload-signature`)
 *   y la subida paralela de archivos hacia ImageKit (`@imagekit/react`).
 */
describe("filesUploader", () => {
  const mockUpload = vi.mocked(upload);

  beforeEach(() => {
    mockUpload.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("solicita firmas a POST /api/storage/upload-signature con amount igual a files.length, sube los archivos en paralelo con todos los parámetros requeridos y retorna [{ fileUrl, fileId }]", async () => {
    const fixedTimestamp = 1710000000000;
    vi.spyOn(Date, "now").mockReturnValue(fixedTimestamp);

    const user = buildMockUser({ username: "juan_perez" });
    const files = [
      new File(["img-1"], "photo1.webp", { type: "image/webp" }),
      new File(["img-2"], "photo2.png", { type: "" }),
      new File(["img-3"], "vector.svg", { type: "image/svg+xml" })
    ];

    let requestedAmount: number | undefined;

    server.use(
      http.post("/api/storage/upload-signature", async ({ request }) => {
        const body = (await request.json()) as { amount: number };
        requestedAmount = body.amount;

        return HttpResponse.json({
          data: [
            { expire: 1700000001, signature: "sig-1", token: "tok-1" },
            { expire: 1700000002, signature: "sig-2", token: "tok-2" },
            { expire: 1700000003, signature: "sig-3", token: "tok-3" }
          ]
        });
      })
    );

    mockUpload
      .mockResolvedValueOnce({
        url: "https://ik.imagekit.io/snapgram/posts/file1.webp",
        fileId: "ik_file_1"
      } as UploadResponse)
      .mockResolvedValueOnce({
        url: "https://ik.imagekit.io/snapgram/posts/file2.png",
        fileId: "ik_file_2"
      } as UploadResponse)
      .mockResolvedValueOnce({
        url: "https://ik.imagekit.io/snapgram/posts/file3.svg",
        fileId: "ik_file_3"
      } as UploadResponse);

    const result = await filesUploader({
      files,
      currentUser: user,
      folderName: `/posts/${user._id}`
    });

    expect(requestedAmount).toBe(3);
    expect(mockUpload).toHaveBeenCalledTimes(3);

    // Validación estricta del payload completo enviado al SDK de ImageKit (incluyendo index, fallback de extensión y publicKey)
    expect(mockUpload).toHaveBeenNthCalledWith(1, {
      file: files[0],
      folder: `/posts/${user._id}`,
      fileName: `juan_perez_${fixedTimestamp}_0.webp`,
      signature: "sig-1",
      expire: 1700000001,
      token: "tok-1",
      publicKey: import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY
    });

    expect(mockUpload).toHaveBeenNthCalledWith(2, {
      file: files[1],
      folder: `/posts/${user._id}`,
      fileName: `juan_perez_${fixedTimestamp}_1.png`,
      signature: "sig-2",
      expire: 1700000002,
      token: "tok-2",
      publicKey: import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY
    });

    expect(mockUpload).toHaveBeenNthCalledWith(3, {
      file: files[2],
      folder: `/posts/${user._id}`,
      fileName: `juan_perez_${fixedTimestamp}_2.svg`,
      signature: "sig-3",
      expire: 1700000003,
      token: "tok-3",
      publicKey: import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY
    });

    expect(result).toEqual([
      {
        fileUrl: "https://ik.imagekit.io/snapgram/posts/file1.webp",
        fileId: "ik_file_1"
      },
      {
        fileUrl: "https://ik.imagekit.io/snapgram/posts/file2.png",
        fileId: "ik_file_2"
      },
      {
        fileUrl: "https://ik.imagekit.io/snapgram/posts/file3.svg",
        fileId: "ik_file_3"
      }
    ]);
  });

  it("retorna inmediatamente un arreglo vacío [] sin realizar peticiones de red si currentUser es null", async () => {
    const signatureEndpointSpy = vi.fn();

    server.use(
      http.post("/api/storage/upload-signature", () => {
        signatureEndpointSpy();
        return HttpResponse.json({ data: [] });
      })
    );

    const file = new File(["img"], "avatar.webp", { type: "image/webp" });

    const result = await filesUploader({
      files: [file],
      currentUser: null,
      folderName: "/avatars"
    });

    expect(result).toEqual([]);
    expect(signatureEndpointSpy).not.toHaveBeenCalled();
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("lanza el error 'No se ha proporcionado un archivo válido' sin realizar peticiones de red si files está vacío o es nulo", async () => {
    const user = buildMockUser();
    const signatureEndpointSpy = vi.fn();

    server.use(
      http.post("/api/storage/upload-signature", () => {
        signatureEndpointSpy();
        return HttpResponse.json({ data: [] });
      })
    );

    await expect(
      filesUploader({
        files: [],
        currentUser: user,
        folderName: `/posts/${user._id}`
      })
    ).rejects.toThrowError("No se ha proporcionado un archivo válido");

    await expect(
      filesUploader({
        files: null as unknown as File[],
        currentUser: user,
        folderName: `/posts/${user._id}`
      })
    ).rejects.toThrowError("No se ha proporcionado un archivo válido");

    expect(signatureEndpointSpy).not.toHaveBeenCalled();
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("propaga errores del endpoint de firmas o de subida a ImageKit (preservando fileIds en fallos parciales), y filtra entradas incompletas sin fileUrl o fileId", async () => {
    const user = buildMockUser();
    const files = [
      new File(["1"], "1.webp", { type: "image/webp" }),
      new File(["2"], "2.webp", { type: "image/webp" }),
      new File(["3"], "3.webp", { type: "image/webp" }),
      new File(["4"], "4.webp", { type: "image/webp" })
    ];

    server.use(
      http.post("/api/storage/upload-signature", async ({ request }) => {
        const { amount } = (await request.json()) as { amount: number };
        return HttpResponse.json({
          data: Array.from({ length: amount }, (_, idx) => ({
            expire: 1700000000 + idx,
            signature: `sig-${idx}`,
            token: `tok-${idx}`
          }))
        });
      })
    );

    // 1. Filtra entradas devueltas por ImageKit que no tengan url o fileId (incluyendo undefined)
    mockUpload
      .mockResolvedValueOnce({
        url: "https://ik.imagekit.io/snapgram/valid.webp",
        fileId: "valid_id"
      } as UploadResponse)
      .mockResolvedValueOnce({
        url: "",
        fileId: "missing_url_id"
      } as UploadResponse)
      .mockResolvedValueOnce({
        url: "https://ik.imagekit.io/snapgram/missing_id.webp",
        fileId: ""
      } as UploadResponse)
      .mockResolvedValueOnce({
        url: undefined,
        fileId: undefined
      } as unknown as UploadResponse);

    const filteredResult = await filesUploader({
      files,
      currentUser: user,
      folderName: "/posts"
    });

    expect(filteredResult).toEqual([
      {
        fileUrl: "https://ik.imagekit.io/snapgram/valid.webp",
        fileId: "valid_id"
      }
    ]);

    // 2. En fallo parcial (2 subidas exitosas y 1 fallida), rechaza con FilesUploadError conservando los fileId subidos para rollback
    mockUpload
      .mockResolvedValueOnce({
        url: "https://ik.imagekit.io/snapgram/1.webp",
        fileId: "ik_partial_1"
      } as UploadResponse)
      .mockResolvedValueOnce({
        url: "https://ik.imagekit.io/snapgram/2.webp",
        fileId: "ik_partial_2"
      } as UploadResponse)
      .mockRejectedValueOnce(new Error("ImageKit upload failed"));

    await expect(
      filesUploader({
        files: files.slice(0, 3),
        currentUser: user,
        folderName: "/posts"
      })
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(FilesUploadError);
      const uploadError = error as FilesUploadError;
      expect(uploadError.message).toBe("ImageKit upload failed");
      expect(uploadError.uploadedFileIds).toEqual(["ik_partial_1", "ik_partial_2"]);
      expect(uploadError.uploadedFiles).toEqual([
        { fileUrl: "https://ik.imagekit.io/snapgram/1.webp", fileId: "ik_partial_1" },
        { fileUrl: "https://ik.imagekit.io/snapgram/2.webp", fileId: "ik_partial_2" }
      ]);
      return true;
    });

    // 3. Lanza error descriptivo sin llamar a ImageKit si el backend devuelve menos firmas que files.length
    mockUpload.mockClear();

    server.use(
      http.post("/api/storage/upload-signature", () => {
        return HttpResponse.json({
          data: [{ expire: 1700000000, signature: "only-one", token: "tok-1" }]
        });
      })
    );

    await expect(
      filesUploader({
        files: files.slice(0, 2),
        currentUser: user,
        folderName: "/posts"
      })
    ).rejects.toThrowError("No se recibieron firmas de autorización válidas para todos los archivos");

    expect(mockUpload).not.toHaveBeenCalled();

    // 4. Propaga error HTTP sin llamar a ImageKit cuando /storage/upload-signature responde 500
    server.use(
      http.post("/api/storage/upload-signature", () => {
        return HttpResponse.json(
          { message: "Error generando firmas de subida" },
          { status: 500 }
        );
      })
    );

    await expect(
      filesUploader({
        files: [files[0]],
        currentUser: user,
        folderName: "/posts"
      })
    ).rejects.toThrowError(/500/);

    expect(mockUpload).not.toHaveBeenCalled();
  });
});