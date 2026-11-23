import ReactCrop from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Check, Loader2Icon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import CropModeControls from "./CropModeControls";
import useImageCropper from "@/hooks/useImageCropper";

const CROPPER_MAX_HEIGHT = "clamp(160px, calc(90dvh - 18rem), 52dvh)";

export interface ImageCropperModalProps {
  open: boolean;
  imageSrc: string | null;
  originalFileName?: string;
  isSubmitting?: boolean;
  onConfirm: (croppedFile: File) => Promise<void> | void;
  onCancel: () => void;
}

const ImageCropperModal = ({
  open,
  imageSrc,
  originalFileName,
  isSubmitting = false,
  onConfirm,
  onCancel,
}: ImageCropperModalProps) => {
  const {
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
  } = useImageCropper({ open, imageSrc });

  const isBusy = isApplying || isSubmitting;

  const handleConfirm = async () => {
    const croppedFile = await applyCrop(originalFileName);
    if (!croppedFile) return;

    await onConfirm(croppedFile);
  };

  return (
    <Dialog
      open={open && Boolean(imageSrc)}
      onOpenChange={(isOpen) => {
        if (!isOpen && !isBusy) {
          onCancel();
        }
      }}
    >
      <DialogOverlay className="bg-black/80 z-[60]" />

      <DialogContent
        className="z-[60] sm:max-w-[640px] max-h-[90dvh] flex flex-col gap-4 overflow-y-auto"
        data-testid="image-cropper-modal"
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>Recortar imagen</DialogTitle>
          <DialogDescription>
            Ajusta el área que deseas conservar en modo libre o manteniendo la relación de aspecto.
          </DialogDescription>
        </DialogHeader>

        <CropModeControls
          cropMode={cropMode}
          aspectPreset={aspectPreset}
          disabled={isBusy}
          onModeChange={onModeChange}
          onAspectPresetChange={onAspectPresetChange}
          onReset={onResetCrop}
        />

        {/* Área interactiva de recorte */}
        <div className="flex justify-center items-center w-full min-h-[200px] overflow-hidden rounded-md bg-neutral-950/90 p-1.5">
          {imageSrc && (
            <ReactCrop
              className="max-w-full"
              style={{ maxHeight: CROPPER_MAX_HEIGHT }}
              crop={crop}
              aspect={activeAspect}
              disabled={isBusy}
              minWidth={24}
              minHeight={24}
              keepSelection
              onChange={(_, percentCrop) => setCrop(percentCrop)}
            >
              <img
                ref={imgRef}
                className="block w-auto h-auto max-w-full select-none"
                src={imageSrc}
                alt="Vista previa para recortar"
                onLoad={onImageLoad}
                data-testid="cropper-source-image"
              />
            </ReactCrop>
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2 sm:gap-2">
          <Button
            className="cursor-pointer"
            type="button"
            variant="outline"
            disabled={isBusy}
            data-testid="crop-cancel-btn"
            onClick={onCancel}
          >
            Cancelar
          </Button>

          <Button
            className="bg-[#4F39F6] hover:bg-[#331fcf] text-white cursor-pointer"
            type="button"
            disabled={!canApply || isBusy}
            data-testid="crop-confirm-btn"
            onClick={handleConfirm}
          >
            {isBusy ? (
              <>
                <Loader2Icon className="size-4 animate-spin" aria-hidden />
                Aplicando...
              </>
            ) : (
              <>
                <Check className="size-4" aria-hidden />
                Aplicar recorte
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageCropperModal;