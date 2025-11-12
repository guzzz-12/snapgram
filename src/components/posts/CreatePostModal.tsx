import { useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import CreatePostInput from "./CreatePostInput";
import SharedPostCard from "./SharedPostCard";
import SelectedImagesPreviews from "@/components/SelectedImagesPreviews";
import { Dialog, DialogContent, DialogHeader, DialogOverlay, DialogTitle } from "../ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { useCreatePublicationModal } from "@/hooks/useCreatePublicationModal";
import useImagePicker from "@/hooks/useImagePicker";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import type { PostType, PostWithLikes } from "@/types/global";

const CreatePostModal = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get("searchTerm");
  
  const [textContent, setTextContent] = useState("");

  const {user} = useCurrentUser();
  const {open, publicationType, isRepost, repostedPostId, setOpen} = useCreatePublicationModal();

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

  // Mutation para crear el post
  const {mutate: createPostMutation, isPending: isCreatePostPending} = useMutation({
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

  // Query para consultar el post compartido
  const {data: repostedPost, isLoading: isRepostLoading, error: isRepostError} = useQuery({
    queryKey: ["post", repostedPostId],
    queryFn: async () => {
      const token = await getToken();
      
      const {data} = await axiosInstance<{data: PostType}>({
        method: "get",
        url: `/posts/${repostedPostId}`,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return data;
    },
    enabled: !!(open && isRepost && repostedPostId),
    refetchOnWindowFocus: false
  });
  
  // Mutation para compartir el post
  const {mutate: repostMutation, isPending: isRepostPending} = useMutation({
    mutationFn: async () => {
      if (!repostedPostId) return;

      const token = await getToken();

      const {data} = await axiosInstance({
        method: "POST",
        url: `/posts/share/${repostedPostId}`,
        data: {
          content: textContent
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ["posts"]});

      setTextContent("");
      
      setOpen({
        open: false,
        publicationType: null,
        isRepost: false,
        repostedPostId: null
      });

      toast.success("Post compartido.");
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    }
  });

  if (isRepostError) {
    toast.error(`Error al compartir el post: ${errorMessage(isRepostError)}`);
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
            onSubmit={(e) => {
              e.preventDefault();

              if (isRepost) {
                repostMutation();
              } else {
                createPostMutation();
              }
            }}
          >
            <CreatePostInput
              isPending={isPending}
              textContent={textContent}
              setTextContent={setTextContent}
            />

            {!isRepost &&
              <SelectedImagesPreviews
                fileInputRef={fileInputRef}
                isPending={isPending}
                selectedImagePreviews={selectedImagePreviews}
                selectedImageFiles={selectedImageFiles}
                setSelectedImagePreviews={setSelectedImagePreviews}
                setSelectedImageFiles={setSelectedImageFiles}
              />
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