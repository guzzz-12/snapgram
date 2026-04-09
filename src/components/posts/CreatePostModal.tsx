import { useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { ImagePlus, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import CreatePostInput from "./CreatePostInput";
import SharedPostCard from "./SharedPostCard";
import SelectedImagesPreviews from "@/components/SelectedImagesPreviews";
import { Dialog, DialogContent, DialogHeader, DialogOverlay, DialogTitle } from "../ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { useCreatePost, useGetSharedPost, useSharePost } from "@/services/posts";
import { useCreatePublicationModal } from "@/hooks/useCreatePublicationModal";
import useImagePicker from "@/hooks/useImagePicker";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { errorMessage } from "@/utils/errorMessage";

const CreatePostModal = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get("searchTerm");
  
  const [textContent, setTextContent] = useState("");

  const {user} = useCurrentUser();

  const {
    open,
    publicationType,
    isRepost,
    repostedPostId,
    setOpen
  } = useCreatePublicationModal();

  const {
    selectedImageFiles,
    selectedImagePreviews,
    isProcessing,
    setSelectedImageFiles,
    setSelectedImagePreviews,
    onImagePickHandler
  } = useImagePicker({ fileInputRef });

  // Mutation para crear el post
  const {mutate: createPostMutation, isPending: isCreatePostPending} = useCreatePost();

  // Query para consultar el post compartido
  const {
    repostedPost,
    isRepostLoading,
    fetchRepostError
  } = useGetSharedPost({repostedPostId, open, isRepost});
  
  // Mutation para compartir el post
  const {repostMutation, isRepostPending, repostError} = useSharePost();

  const onSubmitHandler = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isRepost && repostedPostId) {
      repostMutation({
        repostedPostId,
        textContent,
        onSuccess: () => {
          setTextContent("");

          setOpen({
            open: false,
            publicationType: null,
            isRepost: false,
            repostedPostId: null
          });

          toast.success("Post compartido.");
        }
      });
    } else {
      createPostMutation({
        user,
        fileInputRef,
        searchTerm,
        selectedImageFiles,
        textContent,
        onSuccess: () => {
          setTextContent("");
          setSelectedImageFiles([]);
          setSelectedImagePreviews([]);
          setOpen({open: false, publicationType: null});

          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }

          toast.success("Post creado.");
        }
      });
    }
  }

  if (fetchRepostError || repostError) {
    const error = (fetchRepostError ?? repostError) as Error;

    toast.error(`Error al compartir el post: ${errorMessage(error)}`);

    setOpen({
      open: false,
      publicationType: null,
      isRepost: false,
      repostedPostId: null
    });
  }

  const isPending = isCreatePostPending || isRepostPending;

  return (
    <Dialog
      open={open && publicationType === "post"}
      onOpenChange={(isOpen) => {
        if (!isPending && !isOpen) {
          setOpen({
            open: false,
            publicationType: null,
            isRepost: false,
            repostedPostId: null
          });
        }
      }}
    >
      <DialogOverlay className="bg-black/80" />

      <DialogContent className="gap-0 max-h-[80vh] overflow-x-hidden overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
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
            onSubmit={onSubmitHandler}
          >
            <CreatePostInput
              isPending={isPending}
              textContent={textContent}
              setTextContent={setTextContent}
            />

            {/* Adjuntar imágenes en el post (sólo si no es un repost) */}
            {!isRepost &&
              <div className="flex justify-start items-center gap-3">
                {selectedImagePreviews.length === 0 && (
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

                <SelectedImagesPreviews
                  fileInputRef={fileInputRef}
                  processingImages={isProcessing}
                  isPending={isPending}
                  selectedImagePreviews={selectedImagePreviews}
                  selectedImageFiles={selectedImageFiles}
                  setSelectedImagePreviews={setSelectedImagePreviews}
                  setSelectedImageFiles={setSelectedImageFiles}
                />
              </div>
            }

            {isRepost && isRepostLoading &&
              <div className="flex justify-center items-center w-full h-40">
                <Loader2Icon className="size-[30px] text-[#4F39F6] animate-spin" aria-hidden />
                <span className="sr-only">Cargando post</span>
              </div>
            }

            {isRepost && repostedPost &&
              <SharedPostCard data={repostedPost.data} />
            }

            <Button
              className="gap-1 w-full mt-3 text-sm font-normal shrink-0 bg-[#4F39F6] hover:bg-[#331fcf] transition-colors cursor-pointer"
              type="submit"
              disabled={isPending || (!isRepost && !textContent && !selectedImageFiles.length)}
            >
              {isPending ? 
                <>
                  <Loader2Icon className="size-4 text-white animate-spin" aria-hidden />
                  Publicando post...
                </>
                :
                <>{isRepost ? "Compartir" : "Publicar"} Post</>
              }
            </Button>
          </form>

          {/* Input oculto del selector de imagen */}
          <input
            ref={fileInputRef}
            type="file"
            hidden
            multiple
            disabled={isPending || isRepost}
            accept="image/png, image/jpg, image/jpeg, image/webp"
            onChange={onImagePickHandler}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CreatePostModal