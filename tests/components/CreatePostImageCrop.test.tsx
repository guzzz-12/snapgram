import { useEffect, type ReactNode } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent, { PointerEventsCheckLevel } from "@testing-library/user-event";
import { mockIntersectionObserver } from "jsdom-testing-mocks";
import Layout from "@/Layout";
import { useAuthContext } from "@/providers/AuthProvider";
import { imageProcessor } from "@/utils/imageCompressor";
import * as imageCropperUtils from "@/utils/imageCropper";
import Providers from "../Providers";
import { buildMockUser } from "../mocks/users/factories";

const { mockUseCurrentUser } = vi.hoisted(() => ({
  mockUseCurrentUser: vi.fn(),
}));

// Mock declarativo de react-image-crop para simular selección en JSDOM
vi.mock("react-image-crop", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-image-crop")>();

  return {
    ...actual,
    default: ({
      children,
      aspect,
      onChange,
    }: {
      children: ReactNode;
      aspect?: number;
      onChange?: (
        pixelCrop: { unit: "px"; x: number; y: number; width: number; height: number },
        percentCrop: { unit: "%"; x: number; y: number; width: number; height: number }
      ) => void;
    }) => {
      useEffect(() => {
        onChange?.(
          { unit: "px", x: 10, y: 10, width: 120, height: 120 },
          { unit: "%", x: 10, y: 10, width: 80, height: 80 }
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [aspect]);

      return (
        <div
          data-testid="mock-react-crop"
          data-aspect={aspect === undefined ? "free" : String(aspect)}
        >
          {children}
        </div>
      );
    },
  };
});

vi.mock("@/utils/imageCompressor", () => ({
  imageProcessor: vi.fn(),
}));

vi.mock("@/providers/AuthProvider", () => ({
  useAuthContext: vi.fn(),
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: mockUseCurrentUser,
}));

const setupCreatePost = async () => {
  const user = userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });
  render(<Layout />, { wrapper: Providers });

  await user.click(await screen.findByTestId("create-publication-btn"));
  await user.click(await screen.findByTestId("create-post-option"));

  return { user };
};

describe("CreatePostModal - Recorte de imágenes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIntersectionObserver();

    mockUseCurrentUser.mockReturnValue({
      user: {
        ...buildMockUser(),
        hasCryptoKeys: true,
        isDisabled: false,
      },
      loadingUser: false,
    });

    (useAuthContext as ReturnType<typeof vi.fn>).mockReturnValue({
      userId: "user_2026_test",
      isLoaded: true,
      isSignedIn: true,
      signOut: vi.fn(),
      getToken: vi.fn().mockResolvedValue("fake-token"),
    });

    (imageProcessor as ReturnType<typeof vi.fn>).mockImplementation(
      async (file: File, resultType: "file" | "base64") => {
        if (resultType === "base64") {
          return `data:image/webp;base64,${file.name}`;
        }
        return file;
      }
    );
  });

  it("abre el modal al clickear la imagen o el botón de lápiz y permite alternar entre modo libre y relación de aspecto", async () => {
    const { user } = await setupCreatePost();

    const file = new File(["img-1"], "foto1.png", { type: "image/png" });
    await user.upload(screen.getByTestId("file-input"), file);

    // 1. Abrir clickeando la imagen
    const imageTrigger = await screen.findByTestId("preview-image-trigger-0");
    await user.click(imageTrigger);

    const cropperModal = await screen.findByTestId("image-cropper-modal");
    expect(cropperModal).toBeInTheDocument();

    // Por defecto inicia en modo libre
    expect(screen.getByTestId("mock-react-crop")).toHaveAttribute("data-aspect", "free");
    expect(screen.queryByTestId("crop-aspect-presets")).not.toBeInTheDocument();

    // Cambiar a modo relación de aspecto
    await user.click(screen.getByTestId("crop-mode-aspect-btn"));
    expect(screen.getByTestId("crop-aspect-presets")).toBeInTheDocument();

    // Seleccionar preset 1:1
    await user.click(screen.getByTestId("crop-aspect-preset-1-1"));
    expect(screen.getByTestId("mock-react-crop")).toHaveAttribute("data-aspect", "1");

    // Volver a modo libre
    await user.click(screen.getByTestId("crop-mode-free-btn"));
    expect(screen.getByTestId("mock-react-crop")).toHaveAttribute("data-aspect", "free");

    // Cancelar y reabrir mediante el botón de lápiz
    await user.click(screen.getByTestId("crop-cancel-btn"));
    await waitFor(() => {
      expect(screen.queryByTestId("image-cropper-modal")).not.toBeInTheDocument();
    });

    await user.click(screen.getByTestId("edit-image-btn-0"));
    expect(await screen.findByTestId("image-cropper-modal")).toBeInTheDocument();
  });

  it("mantiene el preview y el archivo originales intactos si el usuario cancela el recorte", async () => {
    const { user } = await setupCreatePost();

    const files = [
      new File(["img-1"], "primera.png", { type: "image/png" }),
      new File(["img-2"], "segunda.png", { type: "image/png" }),
    ];

    await user.upload(screen.getByTestId("file-input"), files);

    const preview0 = await screen.findByTestId("image-preview-0");
    const preview1 = await screen.findByTestId("image-preview-1");

    expect(within(preview0).getByRole("img")).toHaveAttribute("src", "data:image/webp;base64,primera.png");
    expect(within(preview1).getByRole("img")).toHaveAttribute("src", "data:image/webp;base64,segunda.png");

    await user.click(screen.getByTestId("edit-image-btn-1"));
    expect(await screen.findByTestId("image-cropper-modal")).toBeInTheDocument();

    await user.click(screen.getByTestId("crop-cancel-btn"));

    await waitFor(() => {
      expect(screen.queryByTestId("image-cropper-modal")).not.toBeInTheDocument();
    });

    // Verificar que ningún preview cambió
    expect(within(screen.getByTestId("image-preview-0")).getByRole("img")).toHaveAttribute(
      "src",
      "data:image/webp;base64,primera.png"
    );
    expect(within(screen.getByTestId("image-preview-1")).getByRole("img")).toHaveAttribute(
      "src",
      "data:image/webp;base64,segunda.png"
    );
  });

  it("actualiza el preview y el archivo al aceptar el recorte manteniendo el orden exacto de la lista", async () => {
    const croppedFile = new File(["cropped-middle"], "segunda-recortada.png", {
      type: "image/png",
    });

    const cropSpy = vi
      .spyOn(imageCropperUtils, "cropImageToFile")
      .mockResolvedValue(croppedFile);

    const { user } = await setupCreatePost();

    const files = [
      new File(["img-1"], "primera.png", { type: "image/png" }),
      new File(["img-2"], "segunda.png", { type: "image/png" }),
      new File(["img-3"], "tercera.png", { type: "image/png" }),
    ];

    await user.upload(screen.getByTestId("file-input"), files);

    await screen.findByTestId("image-preview-2");

    // Editar únicamente la imagen del medio (índice 1)
    await user.click(screen.getByTestId("edit-image-btn-1"));
    expect(await screen.findByTestId("image-cropper-modal")).toBeInTheDocument();

    await user.click(screen.getByTestId("crop-confirm-btn"));

    await waitFor(() => {
      expect(screen.queryByTestId("image-cropper-modal")).not.toBeInTheDocument();
    });

    expect(cropSpy).toHaveBeenCalledTimes(1);
    expect(cropSpy).toHaveBeenCalledWith(
      expect.any(HTMLImageElement),
      expect.objectContaining({ unit: "px" }),
      expect.objectContaining({ mimeType: "image/png" })
    );

    // El orden debe permanecer: [primera, segunda-recortada, tercera]
    expect(within(screen.getByTestId("image-preview-0")).getByRole("img")).toHaveAttribute(
      "src",
      "data:image/webp;base64,primera.png"
    );
    expect(within(screen.getByTestId("image-preview-1")).getByRole("img")).toHaveAttribute(
      "src",
      "data:image/webp;base64,segunda-recortada.png"
    );
    expect(within(screen.getByTestId("image-preview-2")).getByRole("img")).toHaveAttribute(
      "src",
      "data:image/webp;base64,tercera.png"
    );

    cropSpy.mockRestore();
  });
});