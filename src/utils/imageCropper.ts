import {
  centerCrop,
  makeAspectCrop,
  type PercentCrop,
  type PixelCrop,
} from "react-image-crop";
import type { AspectRatioValue, CropMode } from "@/types/imageCropper";

export interface CropImageOptions {
  fileName?: string;
  mimeType?: string;
  quality?: number;
}

const DEFAULT_CROP_PERCENT = 90;

/**
 * Resuelve la relación de aspecto numérica a partir del preset elegido
 * y las dimensiones naturales de la imagen.
 */
export const resolveAspectRatio = (
  preset: AspectRatioValue,
  naturalWidth: number,
  naturalHeight: number
): number => {
  if (preset === "original") {
    if (naturalWidth <= 0 || naturalHeight <= 0) return 1;
    return naturalWidth / naturalHeight;
  }

  return preset;
};

/**
 * Calcula el área de recorte inicial centrada en porcentaje (%)
 * para el modo libre o el modo con relación de aspecto bloqueada.
 */
export const createInitialCrop = (
  mediaWidth: number,
  mediaHeight: number,
  mode: CropMode,
  aspect?: number
): PercentCrop => {
  if (mode === "aspect" && aspect && aspect > 0 && mediaWidth > 0 && mediaHeight > 0) {
    return centerCrop(
      makeAspectCrop(
        {
          unit: "%",
          width: DEFAULT_CROP_PERCENT,
        },
        aspect,
        mediaWidth,
        mediaHeight
      ),
      mediaWidth,
      mediaHeight
    ) as PercentCrop;
  }

  const margin = (100 - DEFAULT_CROP_PERCENT) / 2;

  return {
    unit: "%",
    x: margin,
    y: margin,
    width: DEFAULT_CROP_PERCENT,
    height: DEFAULT_CROP_PERCENT,
  };
};

/**
 * Construye un nombre de archivo válido preservando el nombre base original.
 */
export const buildCroppedFileName = (
  originalName?: string,
  mimeType = "image/png"
): string => {
  const extension = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "png";

  if (!originalName?.trim()) {
    return `cropped-image.${extension}`;
  }

  const baseName = originalName.replace(/\.[^/.]+$/, "");
  return `${baseName}.${extension}`;
};

/**
 * Recorta el área seleccionada (PixelCrop en coordenadas renderizadas)
 * mapeándola a la resolución natural de la imagen en un Canvas y devuelve un File.
 */
export const cropImageToFile = async (
  image: HTMLImageElement,
  pixelCrop: PixelCrop,
  options: CropImageOptions = {}
): Promise<File> => {
  if (pixelCrop.width <= 0 || pixelCrop.height <= 0) {
    throw new Error("El área de recorte debe ser mayor que cero.");
  }

  if (image.width <= 0 || image.height <= 0) {
    throw new Error("La imagen todavía no tiene dimensiones válidas para recortar.");
  }

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  const targetWidth = Math.max(1, Math.round(pixelCrop.width * scaleX));
  const targetHeight = Math.max(1, Math.round(pixelCrop.height * scaleY));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No se pudo inicializar el contexto 2D para recortar la imagen.");
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(
    image,
    pixelCrop.x * scaleX,
    pixelCrop.y * scaleY,
    pixelCrop.width * scaleX,
    pixelCrop.height * scaleY,
    0,
    0,
    targetWidth,
    targetHeight
  );

  const mimeType = options.mimeType ?? "image/png";
  const quality = mimeType === "image/png" ? undefined : (options.quality ?? 0.92);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error("No se pudo generar el archivo de la imagen recortada."));
          return;
        }
        resolve(result);
      },
      mimeType,
      quality
    );
  });

  const fileName = buildCroppedFileName(options.fileName, blob.type || mimeType);

  return new File([blob], fileName, {
    type: blob.type || mimeType,
    lastModified: Date.now(),
  });
};