import { useCallback, useEffect, useMemo, useRef, useState, type SyntheticEvent } from "react";
import { convertToPixelCrop, type PercentCrop } from "react-image-crop";
import { toast } from "sonner";
import type { AspectRatioValue, CropMode, NaturalDimensions } from "@/types/imageCropper";
import {
  createInitialCrop,
  cropImageToFile,
  resolveAspectRatio,
} from "@/utils/imageCropper";

interface UseImageCropperParams {
  open: boolean;
  imageSrc: string | null;
}

const useImageCropper = ({ open, imageSrc }: UseImageCropperParams) => {
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [cropMode, setCropMode] = useState<CropMode>("free");
  const [aspectPreset, setAspectPreset] = useState<AspectRatioValue>("original");
  const [crop, setCrop] = useState<PercentCrop | undefined>(undefined);
  const [naturalDimensions, setNaturalDimensions] = useState<NaturalDimensions | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const resetState = useCallback(() => {
    setCropMode("free");
    setAspectPreset("original");
    setCrop(undefined);
    setNaturalDimensions(null);
    setIsApplying(false);
  }, []);

  // Reiniciar el estado cada vez que se cierra el modal o cambia la imagen objetivo
  useEffect(() => {
    if (!open || !imageSrc) {
      resetState();
    }
  }, [open, imageSrc, resetState]);

  const activeAspect = useMemo(() => {
    if (cropMode !== "aspect") return undefined;

    return resolveAspectRatio(
      aspectPreset,
      naturalDimensions?.width ?? 1,
      naturalDimensions?.height ?? 1
    );
  }, [cropMode, aspectPreset, naturalDimensions]);

  const onImageLoad = useCallback(
    (e: SyntheticEvent<HTMLImageElement>) => {
      const { width, height, naturalWidth, naturalHeight } = e.currentTarget;

      setNaturalDimensions({ width: naturalWidth, height: naturalHeight });

      const ratio =
        cropMode === "aspect"
          ? resolveAspectRatio(aspectPreset, naturalWidth, naturalHeight)
          : undefined;

      setCrop(createInitialCrop(width, height, cropMode, ratio));
    },
    [cropMode, aspectPreset]
  );

  const onModeChange = useCallback(
    (nextMode: CropMode) => {
      if (nextMode === cropMode) return;
      setCropMode(nextMode);

      const img = imgRef.current;
      if (!img) return;

      if (nextMode === "aspect") {
        const ratio = resolveAspectRatio(
          aspectPreset,
          img.naturalWidth || naturalDimensions?.width || 1,
          img.naturalHeight || naturalDimensions?.height || 1
        );
        setCrop(createInitialCrop(img.width, img.height, "aspect", ratio));
      }
      // Al cambiar a modo libre se conserva el porcentaje actual y se desbloquean los bordes
    },
    [cropMode, aspectPreset, naturalDimensions]
  );

  const onAspectPresetChange = useCallback(
    (nextPreset: AspectRatioValue) => {
      setAspectPreset(nextPreset);
      setCropMode("aspect");

      const img = imgRef.current;
      if (!img) return;

      const ratio = resolveAspectRatio(
        nextPreset,
        img.naturalWidth || naturalDimensions?.width || 1,
        img.naturalHeight || naturalDimensions?.height || 1
      );
      setCrop(createInitialCrop(img.width, img.height, "aspect", ratio));
    },
    [naturalDimensions]
  );

  const onResetCrop = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;

    const ratio =
      cropMode === "aspect"
        ? resolveAspectRatio(
            aspectPreset,
            img.naturalWidth || naturalDimensions?.width || 1,
            img.naturalHeight || naturalDimensions?.height || 1
          )
        : undefined;

    setCrop(createInitialCrop(img.width, img.height, cropMode, ratio));
  }, [cropMode, aspectPreset, naturalDimensions]);

  const applyCrop = useCallback(
    async (originalFileName?: string): Promise<File | null> => {
      const img = imgRef.current;

      if (!img || !crop || crop.width <= 0 || crop.height <= 0) {
        toast.error("Selecciona un área válida para recortar.");
        return null;
      }

      // Calcular píxeles con las dimensiones actuales del <img> (inmune a resize/rotación)
      const pixelCrop = convertToPixelCrop(crop, img.width, img.height);

      setIsApplying(true);

      try {
        // Exportar sin pérdida (PNG) para que imageProcessor realice la única compresión WebP final
        return await cropImageToFile(img, pixelCrop, {
          fileName: originalFileName,
          mimeType: "image/png",
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Error al recortar la imagen.";
        toast.error(message);
        return null;
      } finally {
        setIsApplying(false);
      }
    },
    [crop]
  );

  const canApply = Boolean(crop && crop.width > 0 && crop.height > 0 && !isApplying);

  return {
    imgRef,
    cropMode,
    aspectPreset,
    activeAspect,
    crop,
    isApplying,
    canApply,
    setCrop,
    onImageLoad,
    onModeChange,
    onAspectPresetChange,
    onResetCrop,
    applyCrop,
    resetState,
  };
};

export default useImageCropper;