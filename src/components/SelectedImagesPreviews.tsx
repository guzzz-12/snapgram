import { useEffect, type Dispatch, type HTMLAttributes, type RefObject, type SetStateAction } from "react";
import { PlusCircle, X } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Skeleton } from "./ui/skeleton";
import { cn } from "@/lib/utils";

interface Props {
  selectedImagePreviews: string[];
  selectedImageFiles: File[];
  processingImages: boolean;
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
    processingImages,
    isPending,
    setSelectedImagePreviews,
    setSelectedImageFiles,
    fileInputRef,
    className,
  } = props;

  // Limpiar el state de las imagenes cuando se desmonte el componente
  useEffect(() => {
    return () => {
      setSelectedImagePreviews([]);
      setSelectedImageFiles([]);
    }
  }, []);

  // El número de imagenes que se estan procesando
  const processingCount = fileInputRef.current?.files?.length ?? 0;

  if (!selectedImagePreviews.length && !processingImages) return null;

  return (
    <div
      style={{contain: "layout"}}
      className={cn("relative flex justify-start items-center gap-3 p-1 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200", processingImages ? "overflow-x-hidden bg-gradient-to-l from-white to-transparent" : "overflow-x-auto", className)}
    >
      {/* Botón para adjuntar más imágenes */}
      <Tooltip>
        <TooltipTrigger asChild>
          {selectedImagePreviews.length > 0 &&
            <button
              className="cursor-pointer"
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
          }
        </TooltipTrigger>

        <TooltipContent>
          Adjuntar más imágenes
        </TooltipContent>
      </Tooltip>

      {/* Mostrar un loader tipo skeleton por cada imagen que se esté procesando */}
      {processingImages &&
        <div className="flex justify-start items-center gap-3 w-full">
          <div className="fixed top-[50%] left-[50%] flex justify-center items-center w-full h-full translate-x-[-50%] translate-y-[-50%] bg-white/50 z-10">
            <p className="text-center text-sm text-neutral-700 font-semibold">
              Procesando...
            </p>
          </div>

          {Array.from({ length: processingCount }).map((_, i) => (
            <div
              key={i}
              className="flex justify-center items-center w-[120px] h-[120px] shrink-0 bg-slate-200 rounded-md"
            >
              <Skeleton className="w-full aspect-[4/3] rounded-md bg-neutral-300" />
            </div>
          ))}
        </div>
      }
      
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