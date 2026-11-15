import { describe, it, expect, vi, beforeEach } from "vitest";
import browserImageCompression from "browser-image-compression";
import { imageProcessor } from "@/utils/imageCompressor";

vi.mock("browser-image-compression", () => ({
  default: vi.fn()
}));

/**
 * Suite unitaria para el procesador y compresor de imágenes (`src/utils/imageCompressor.ts`).
 *
 * Propósito:
 *   Validar la conversión de archivos de imagen a Data URL (Base64) para previsualizaciones
 *   locales y la compresión a formato WebP mediante `browser-image-compression` antes de su subida.
 *
 * Qué evalúa y alcance:
 *   - Conversión a Base64 (`resultType === "base64"`) utilizando `FileReader`.
 *   - Compresión a archivo WebP (`resultType === "file"`) verificando los parámetros por defecto (`maxWidthOrHeight: 4000`, `maxSizeMB: 5`, `initialQuality: 0.75`) y personalizados (`maxSize`).
 *   - Manejo y propagación de errores tanto en la compresión (`browserImageCompression`) como en la lectura del archivo (`FileReader`).
 */
describe("imageProcessor (imageCompressor)", () => {
  const mockCompression = vi.mocked(browserImageCompression);

  beforeEach(() => {
    mockCompression.mockReset();
  });

  it("convierte un objeto File en un Data URL Base64 válido cuando resultType es 'base64'", async () => {
    const fileContent = "contenido-de-imagen-prueba";
    const file = new File([fileContent], "preview.png", { type: "image/png" });

    const result = await imageProcessor(file, "base64");

    expect(typeof result).toBe("string");
    expect(result).toMatch(/^data:image\/png;base64,/);
    expect(mockCompression).not.toHaveBeenCalled();
  });

  it("invoca browser-image-compression con la configuración WebP por defecto (4000px) o un maxSize personalizado cuando resultType es 'file'", async () => {
    const originalFile = new File(["raw-bytes"], "photo.jpg", { type: "image/jpeg" });
    const compressedFile = new File(["compressed-bytes"], "photo.webp", { type: "image/webp" });

    mockCompression.mockResolvedValue(compressedFile);

    // 1. Con tamaño máximo por defecto (4000)
    const defaultResult = await imageProcessor(originalFile, "file");

    expect(mockCompression).toHaveBeenCalledTimes(1);
    expect(mockCompression).toHaveBeenCalledWith(originalFile, {
      fileType: "image/webp",
      maxSizeMB: 5,
      maxWidthOrHeight: 4000,
      initialQuality: 0.75,
      useWebWorker: true
    });
    expect(defaultResult).toBe(compressedFile);

    // 2. Con tamaño máximo personalizado (ej. 1080)
    const customResult = await imageProcessor(originalFile, "file", 1080);

    expect(mockCompression).toHaveBeenLastCalledWith(originalFile, {
      fileType: "image/webp",
      maxSizeMB: 5,
      maxWidthOrHeight: 1080,
      initialQuality: 0.75,
      useWebWorker: true
    });
    expect(customResult).toBe(compressedFile);
  });

  it("captura y lanza un Error cuando falla browserImageCompression o FileReader", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const file = new File(["corrupted"], "bad.png", { type: "image/png" });

    // 1. Error en browserImageCompression
    mockCompression.mockRejectedValueOnce(new Error("No se pudo comprimir la imagen"));

    await expect(imageProcessor(file, "file")).rejects.toThrowError(
      "No se pudo comprimir la imagen"
    );

    // 2. Error en FileReader al leer como Base64
    const readAsDataURLSpy = vi
      .spyOn(FileReader.prototype, "readAsDataURL")
      .mockImplementationOnce(function (this: FileReader) {
        queueMicrotask(() => {
          this.onerror?.(new ProgressEvent("error") as ProgressEvent<FileReader>);
        });
      });

    await expect(imageProcessor(file, "base64")).rejects.toBeDefined();

    readAsDataURLSpy.mockRestore();
    logSpy.mockRestore();
  });
});
