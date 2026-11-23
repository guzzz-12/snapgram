import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  buildCroppedFileName,
  createInitialCrop,
  cropImageToFile,
  resolveAspectRatio,
} from "@/utils/imageCropper";

describe("imageCropper utils", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("resolveAspectRatio", () => {
    it("retorna la relación natural width/height cuando el preset es 'original'", () => {
      expect(resolveAspectRatio("original", 1920, 1080)).toBeCloseTo(16 / 9);
      expect(resolveAspectRatio("original", 0, 0)).toBe(1);
    });

    it("retorna el valor numérico exacto cuando se elige una proporción fija", () => {
      expect(resolveAspectRatio(1, 1920, 1080)).toBe(1);
      expect(resolveAspectRatio(4 / 5, 1000, 1000)).toBeCloseTo(0.8);
    });
  });

  describe("createInitialCrop", () => {
    it("crea una selección centrada del 90% en modo libre", () => {
      const crop = createInitialCrop(400, 300, "free");

      expect(crop).toEqual({
        unit: "%",
        x: 5,
        y: 5,
        width: 90,
        height: 90,
      });
    });

    it("crea una selección centrada respetando el aspect ratio en modo aspect", () => {
      const crop = createInitialCrop(400, 200, "aspect", 1);

      expect(crop.unit).toBe("%");
      const pxWidth = (crop.width / 100) * 400;
      const pxHeight = (crop.height / 100) * 200;
      expect(pxWidth / pxHeight).toBeCloseTo(1, 2);
    });
  });

  describe("buildCroppedFileName", () => {
    it("reemplaza la extensión original por el formato destino", () => {
      expect(buildCroppedFileName("vacaciones.jpg")).toBe("vacaciones.png");
      expect(buildCroppedFileName("foto.final.jpeg", "image/jpeg")).toBe("foto.final.jpg");
      expect(buildCroppedFileName(undefined)).toBe("cropped-image.png");
    });
  });

  describe("cropImageToFile", () => {
    const drawImageMock = vi.fn();

    beforeEach(() => {
      drawImageMock.mockReset();

      vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
        drawImage: drawImageMock,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: "high",
      } as unknown as CanvasRenderingContext2D);

      vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((cb, type) => {
        cb(new Blob(["cropped-bytes"], { type: type || "image/png" }));
      });
    });

    it("escala las coordenadas renderizadas a la resolución natural y devuelve un File PNG sin pérdida por defecto", async () => {
      const img = document.createElement("img");
      Object.defineProperties(img, {
        width: { value: 200 },
        height: { value: 100 },
        naturalWidth: { value: 1000 },
        naturalHeight: { value: 500 },
      });

      const file = await cropImageToFile(
        img,
        { unit: "px", x: 20, y: 10, width: 100, height: 50 },
        { fileName: "landscape.jpg" }
      );

      expect(drawImageMock).toHaveBeenCalledWith(
        img,
        100, // 20 * 5
        50,  // 10 * 5
        500, // 100 * 5
        250, // 50 * 5
        0,
        0,
        500,
        250
      );
      expect(file).toBeInstanceOf(File);
      expect(file.name).toBe("landscape.png");
      expect(file.type).toBe("image/png");
    });

    it("lanza un error si el área de recorte es cero", async () => {
      const img = document.createElement("img");
      Object.defineProperties(img, {
        width: { value: 200 },
        height: { value: 100 },
        naturalWidth: { value: 1000 },
        naturalHeight: { value: 500 },
      });

      await expect(
        cropImageToFile(img, { unit: "px", x: 0, y: 0, width: 0, height: 0 })
      ).rejects.toThrow("El área de recorte debe ser mayor que cero.");
    });
  });
});