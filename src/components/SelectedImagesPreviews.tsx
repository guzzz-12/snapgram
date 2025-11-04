import type { Dispatch, HTMLAttributes, RefObject, SetStateAction } from "react";
import { ImagePlus, PlusCircle, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  selectedImagePreviews: string[];
  selectedImageFiles: File[];
  isPending: boolean;
  setSelectedImagePreviews: Dispatch<SetStateAction<string[]>>;
  setSelectedImageFiles: Dispatch<SetStateAction<File[]>>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  className?: HTMLAttributes<HTMLElement>["className"];
}

const SelectedImagesPreviews = (props: Props) => {
  const {
    selectedImagePreviews,
    selectedImageFiles,
    isPending,
    setSelectedImagePreviews,
    setSelectedImageFiles,
    fileInputRef,
    className,
  } = props;

  return (
    <div className={cn("flex justify-start items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200", className)}>
      {!selectedImagePreviews.length && (
        <button
          className="cursor-pointer"
          type="button"
          disabled={isPending}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus className="size-10 text-neutral-600 stroke-1" aria-hidden />
          <span className="sr-only">Adjuntar imágenes</span>
        </button>
      )}

      <button
        className="p-2 cursor-pointer"
        type="button"
        disabled={isPending}
        onClick={() => {
          if (selectedImagePreviews.length >= 10) {
            toast.error(`Puedes seleccionar un máximo de 10 imágenes.`);
            return false;
          }

          fileInputRef.current?.click()
        }}
      >
        <PlusCircle className="size-10 text-neutral-600 stroke-1" aria-hidden />
        <span className="sr-only">Adjuntar otra imagen</span>
      </button>

      <div className="flex justify-start items-center gap-3 w-full">
        {selectedImagePreviews.map((preview, i) => (
          <div
            key={i}
            className="relative w-[120px] h-[120px] shrink-0 bg-slate-200 rounded-sm"
          >
            <button
              className="absolute top-0.5 right-0.5 flex justify-center items-center p-0.5 rounded-full cursor-pointer text-red-700 bg-red-50"
              type="button"
              disabled={isPending}
              onClick={() => {
                setSelectedImageFiles(selectedImageFiles.filter((_, index) => index !== i));
                setSelectedImagePreviews(selectedImagePreviews.filter((_, index) => index !== i));
              }}
            >
              <X className="size-4" aria-hidden />
              <span className="sr-only">Eliminar imagen</span>
            </button>

            <img
              className="w-full h-full object-contain rounded-sm"
              src={preview}
              alt=""
            />
          </div>                    
        ))}
      </div>
    </div>
  )
}

export default SelectedImagesPreviews