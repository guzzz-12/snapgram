import { useRef } from "react";
import { ImagePlus, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogOverlay, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUpdateGroupImage } from "@/services/chats";
import useImagePicker from "@/hooks/useImagePicker";

interface Props {
  groupId: string;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const UpdateGroupImgModal = (props: Props) => {  
  const { groupId, isOpen, setIsOpen } = props;

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {isProcessing, selectedImageFiles, selectedImagePreviews, setSelectedImageFiles, setSelectedImagePreviews, onImagePickHandler} = useImagePicker({
    fileInputRef,
    maxSize: 1000
  });

  const {mutate, isPending} = useUpdateGroupImage({
    groupId,
    selectedImageFiles,
    onSuccess: () => {
      toast.success("Imagen del grupo actualizada con éxito");
      setSelectedImageFiles([]);
      setSelectedImagePreviews([]);
      setIsOpen(false);
    }
  });

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(isOpen) => {
        if (isPending || isProcessing) return;

        setIsOpen(isOpen);

        if (!isOpen) {
          setSelectedImageFiles([]);  
          setSelectedImagePreviews([]);  
        }
      }}
    >
      <DialogOverlay className="bg-black/70" />

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Actualizar imagen del grupo
          </DialogTitle>
        </DialogHeader>

        <div className="w-full max-w-[600px]">
          <form
            className="flex flex-col gap-4 w-full"
            onSubmit={(e) => {
              e.preventDefault();
              mutate();
            }}
          >
            {isProcessing &&
              <div className="flex justify-center items-center gap-2 w-full shrink-0 aspect-[4/3] rounded-md overflow-hidden border">
                <Loader2Icon className="size-6 text-[#4F39F6] animate-spin stroke-1" />
                <span className="text-center text-sm text-neutral-600">
                  Procesando imagen...
                </span>
              </div>
            }

            {!isProcessing && selectedImageFiles.length === 0 &&
              <button
                className="flex flex-col justify-center items-center gap-1 w-full aspect-[4/3] p-2 rounded-md border border-dashed border-blue-600 bg-neutral-100 hover:bg-neutral-200 cursor-pointer transition-colors"
                disabled={isPending || isProcessing}
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus className="size-10 text-blue-600 stroke-1" aria-hidden />
                Seleccionar imagen
              </button>
            }

            {selectedImagePreviews.length > 0 &&
              <div className="relative w-full shrink-0 aspect-[4/3] rounded-md bg-neutral-700 overflow-hidden border">
                <div
                  className="absolute top-0 left-0 w-full h-full opacity-60"
                  style={{
                    backgroundImage: `url(${selectedImagePreviews[0]})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center"
                  }}
                />

                <img
                  className="w-full h-full object-contain object-center backdrop-blur"
                  src={selectedImagePreviews[0]}
                  alt="Imagen del grupo"
                />
              </div>
            }
            
            <div className="flex justify-end items-center gap-2 w-full">
              <Button
                className="w-fit cursor-pointer"
                variant="ghost"
                type="button"
                disabled={isPending}
                onClick={() => {
                  setSelectedImageFiles([]);
                  setSelectedImagePreviews([]);
                  setIsOpen(false);
                }}
              >
                Cancelar
              </Button>

              <Button
                className="w-fit bg-[#4F39F6] hover:bg-[#331fcf] transition-colors cursor-pointer"
                type="submit"
                disabled={isPending || selectedImageFiles.length === 0}
              >
                Guardar cambios
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>

      {/* Input oculto del selector de imagen */}
      <input
        ref={fileInputRef}
        type="file"
        hidden
        multiple
        disabled={isPending}
        accept="image/png, image/jpg, image/jpeg, image/webp"
        onChange={onImagePickHandler}
      />
    </Dialog>
  )
}

export default UpdateGroupImgModal