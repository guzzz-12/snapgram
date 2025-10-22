import { useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2Icon, PlusCircle, X } from "lucide-react";
import { toast } from "sonner";
import CreatePostInput from "./CreatePostInput";
import { Dialog, DialogContent, DialogHeader, DialogOverlay, DialogTitle } from "../ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { useCreatePublicationModal } from "@/hooks/useCreatePublicationModal";
import useImagePicker from "@/hooks/useImagePicker";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import type { PostWithLikes } from "@/types/global";

const CreatePostModal = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get("searchTerm");
  
  const [textContent, setTextContent] = useState("");

  const {user} = useCurrentUser();
  const {open, publicationType, setOpen} = useCreatePublicationModal();

  const {selectedImageFiles, selectedImagePreviews, setSelectedImageFiles, setSelectedImagePreviews, onImagePickHandler} = useImagePicker({ fileInputRef });

  const {getToken} = useAuth();
  const queryClient = useQueryClient();

  const createPost = async () => {
    if (!textContent && !selectedImageFiles) return;

    const formData = new FormData();

    if (textContent) {
      formData.append("content", textContent);
    }

    selectedImageFiles.forEach(file => formData.append("images", file));

    const token = await getToken();

    const {data} = await axiosInstance<{data: PostWithLikes}>({
      method: "POST",
      url: "/posts",
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${token}`
      }
    });

    return data;
  }

  const {mutate, isPending} = useMutation({
    mutationFn: createPost,
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ["posts"]});

      if (searchTerm) {
        await queryClient.invalidateQueries({queryKey: ["search", searchTerm, "posts"]});
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setTextContent("");

      toast.success("Post creado con éxito.");

      setSelectedImageFiles([]);
      setSelectedImagePreviews([]);

      setOpen({open: false, publicationType: null});
    },
    onError: (error) => {
      const message = errorMessage(error);
      toast.error(message);
    }
  });

  return (
    <Dialog
      open={open && publicationType === "post"}
      onOpenChange={(isOpen) => {
        if (!isPending && !isOpen) {
          setOpen({open: false, publicationType: null});
        }
      }}
    >
      <DialogOverlay className="bg-black/80" />

      <DialogContent className="gap-0 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="sr-only">
            Crear publicación
          </DialogTitle>
        </DialogHeader>

        <div className="w-full max-w-[600px] h-auto overflow-hidden">
          <div className="flex justify-start items-center gap-2 mb-4">
            <Avatar className="w-[40px] h-[40px] shrink-0">
              <AvatarImage
                className="w-full h-full object-cover"
                src={user?.profilePicture}
                alt={user?.username}
              />

              <AvatarFallback className="w-full h-full object-cover">
                {user?.fullName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col w-full">
              <p className="font-semibold text-sm text-neutral-900">
                {user?.fullName}
              </p>

              <p className="text-xs text-neutral-700">
                @{user?.username}
              </p>
            </div>
          </div>

          <form
            className="flex flex-col gap-2 w-full"
            onSubmit={(e) => {
              e.preventDefault();
              mutate();
            }}
          >
            <CreatePostInput
              isPending={isPending}
              textContent={textContent}
              setTextContent={setTextContent}
            />

            <div className="flex justify-start items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
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

              {selectedImagePreviews.length > 0 && selectedImagePreviews.length < 10 && (
                <button
                  className="p-2 cursor-pointer"
                  type="button"
                  disabled={isPending}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <PlusCircle className="size-10 text-neutral-600 stroke-1" aria-hidden />
                  <span className="sr-only">Adjuntar otra imagen</span>
                </button>
              )}

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

            <Button
              className="gap-1 w-full mt-3 text-sm font-normal shrink-0 bg-[#4F39F6] hover:bg-[#331fcf] transition-colors cursor-pointer"
              type="submit"
              disabled={isPending || (!textContent && !selectedImageFiles.length)}
            >
              {isPending ? 
                <>
                  <Loader2Icon className="size-4 text-white animate-spin" aria-hidden />
                  Publicando post...
                </>
                :
                <>Publicar Post</>
              }
            </Button>
          </form>

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
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CreatePostModal