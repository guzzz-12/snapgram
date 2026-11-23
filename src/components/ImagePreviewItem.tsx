import { Pencil, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface ImagePreviewItemProps {
  preview: string;
  index: number;
  disabled: boolean;
  onRemove: () => void;
  onEdit?: () => void;
}

const ImagePreviewItem = ({
  preview,
  index,
  disabled,
  onRemove,
  onEdit,
}: ImagePreviewItemProps) => {
  return (
    <div
      className="group relative w-[120px] h-[120px] shrink-0 bg-slate-200 dark:bg-slate-800 rounded-sm overflow-hidden"
      data-testid={`image-preview-${index}`}
    >
      {/* Botón para eliminar la imagen */}
      <button
        className="absolute top-1 right-1 z-10 flex justify-center items-center p-0.5 rounded-full cursor-pointer text-red-700 bg-red-50/95 hover:bg-red-100 shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        type="button"
        disabled={disabled}
        data-testid={`remove-image-btn-${index}`}
        onClick={onRemove}
      >
        <X className="size-4" aria-hidden />
        <span className="sr-only">Eliminar imagen</span>
      </button>

      {/* Botón de lápiz para abrir el modal de recorte (solo si onEdit está habilitado) */}
      {onEdit && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="absolute bottom-1 right-1 z-10 flex justify-center items-center p-1 rounded-full cursor-pointer text-white bg-black/70 hover:bg-[#4F39F6] shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
              disabled={disabled}
              data-testid={`edit-image-btn-${index}`}
              onClick={onEdit}
            >
              <Pencil className="size-3.5" aria-hidden />
              <span className="sr-only">Recortar imagen</span>
            </button>
          </TooltipTrigger>

          <TooltipContent>Recortar imagen</TooltipContent>
        </Tooltip>
      )}

      {/* Imagen clickeable para recortar o estática si no se pasa onEdit */}
      {onEdit ? (
        <button
          className="relative w-full h-full block cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F39F6] disabled:cursor-not-allowed"
          type="button"
          disabled={disabled}
          data-testid={`preview-image-trigger-${index}`}
          aria-label={`Recortar imagen ${index + 1}`}
          onClick={onEdit}
        >
          <img
            className="w-full h-full object-contain rounded-sm transition-opacity group-hover:opacity-85"
            src={preview}
            alt={`Vista previa ${index + 1}`}
          />
        </button>
      ) : (
        <img
          className="w-full h-full object-contain rounded-sm"
          src={preview}
          alt={`Vista previa ${index + 1}`}
        />
      )}
    </div>
  );
};

export default ImagePreviewItem;