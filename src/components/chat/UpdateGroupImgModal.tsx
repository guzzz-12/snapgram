import { type ChangeEvent, type Dispatch, type RefObject, type SetStateAction } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useMutation } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import type { ChatType } from "@/types/global";

interface Props {
  groupId: string;
  isProcessingImage: boolean;
  selectedImagePreviews: string[];
  selectedImageFiles: File[];
  setSelectedImagePreviews: Dispatch<SetStateAction<string[]>>;
  setSelectedImageFiles: Dispatch<SetStateAction<File[]>>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onImagePickHandler: (e: ChangeEvent<HTMLInputElement>) => Promise<false | undefined>;
}

const UpdateGroupImgModal = (props: Props) => {  
  const {
    groupId,
    isProcessingImage,
    selectedImagePreviews,
    selectedImageFiles,
    fileInputRef,
    setSelectedImageFiles,
    setSelectedImagePreviews,
    onImagePickHandler,
  } = props;

  const {getToken} = useAuth();

  const updateGroupImg = async () => {
    const token = await getToken();

    const formData = new FormData();
    formData.append("groupImage", selectedImageFiles[0]!);

    const {data} = await axiosInstance<{data: ChatType}>({
      method: "PUT",
      url: `/chats/group/${groupId}/update-image`,
      data: formData,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return data;
  }

  const {mutate, isPending} = useMutation({
    mutationFn: updateGroupImg,
    onSuccess: async () => {
      setSelectedImageFiles([]);
      setSelectedImagePreviews([]);
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    }
  });

  return (
    <Dialog
      open={isProcessingImage || selectedImageFiles.length > 0}
      onOpenChange={(isOpen) => {
        if (isPending || isProcessingImage) return;

        if (!isOpen) {
          setSelectedImageFiles([]);  
          setSelectedImagePreviews([]);  
        }
      }}
    >
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
            {isProcessingImage &&
              <div className="flex justify-center items-center gap-2 w-full shrink-0 aspect-[4/3] rounded-md overflow-hidden border">
                <Loader2Icon className="size-6 text-[#4F39F6] animate-spin stroke-1" />
                <span className="text-center text-sm text-neutral-600">
                  Procesando imagen...
                </span>
              </div>
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