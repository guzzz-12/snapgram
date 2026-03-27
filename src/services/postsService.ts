import type { RefObject } from "react";
import { useNavigate } from "react-router";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";
import { createPostFn, fetchPosts, getPost } from "@/repositories/postsRepository";
import type { PostTypeEnum } from "@/hooks/useCreatePublicationModal";
import { errorMessage } from "@/utils/errorMessage";
import { axiosInstance } from "@/utils/axiosInstance";
import type { PostType, PostWithLikes } from "@/types/global";

type GetPostProps = {
  postId: string | undefined;
}

type CreatePostProps = {
  searchTerm: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  textContent: string;
  selectedImageFiles: File[];
  setTextContent: (value: string) => void;
  setOpen: (open: {open: boolean, publicationType: PostTypeEnum}) => void;
  setSelectedImageFiles: (files: File[]) => void;
  setSelectedImagePreviews: (previews: string[]) => void;
}

type SharePostProps = {
  repostedPostId: string | null | undefined;
  textContent: string;
  setTextContent: (value: string) => void;
  setOpen: (open: {
    open: boolean;
    publicationType: PostTypeEnum;
    isRepost: boolean;
    repostedPostId: string | null;
  }) => void;
}

export type EditPostProps = {
  postData: PostWithLikes;
  updatedTextContent: string;
  searchTerm: string | null;
  setTextContent: (value: string) => void;
  setIsEditingPost: (value: boolean) => void;
}

type DeletePostProps = {
  postId: string;
  pathname: string | undefined;
  searchTerm: string | null;
  setIsDeleting: (isDeleting: boolean) => void;
  setIsOpen: (isOpen: boolean) => void;
}

/**
 * Servicios de posts.
 * Debe ser invocado en el top level del componente.
*/
export const usePostsService = () => {
  const navigate = useNavigate();

  const { getToken } = useAuth();

  const queryClient = useQueryClient();

  return {
    /** Consultar un post mediante su ID */
    getPostById: ({postId}: GetPostProps) => {
      return useQuery({
        queryKey: ["posts", postId],
        queryFn: async () => getPost({postId, getToken}),
        enabled: !!postId,
        refetchOnWindowFocus: false,
        retry: 1
      });
    },

    /** Consultar y paginar los posts del feed del usuario */
    getFeedPosts: () => {
      const res = useInfiniteQuery({
        queryKey: ["posts"],
        queryFn: ({pageParam}) => fetchPosts(pageParam, getToken),
        initialPageParam: 1,
        getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
        refetchOnWindowFocus: false
      });

      const {data, error, isLoading: loadingPosts, isFetchingNextPage, hasNextPage, fetchNextPage} = res;

      const posts = data?.pages.flatMap(page => page.data) || [];

      return {
        posts,
        error,
        loadingPosts,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage
      }
    },

    /** Crear un nuevo post */
    createPost: (params: CreatePostProps) => {
      const {searchTerm, fileInputRef, setTextContent, setSelectedImageFiles, setOpen, setSelectedImagePreviews} = params;

      const {mutate, isPending} = useMutation({
        mutationFn: createPostFn,
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

      return {
        mutate,
        isPending
      }
    },

    /** Compartir un post */
    sharePost: (params: SharePostProps) => {
      const {repostedPostId, textContent, setOpen, setTextContent} = params;

      const {mutate, isPending, error} = useMutation({
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

      return {
        repostMutation: mutate,
        isRepostPending: isPending,
        repostError: error
      }
    },

    /** Consultar un post compartido */
    getSharedPost: (
      params: {
        repostedPostId: string | null | undefined;
        open: boolean;
        isRepost: boolean | undefined;
      }
    ) => {
      const {repostedPostId, open, isRepost} = params;

      const res = useQuery({
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

      return {
        repostedPost: res.data,
        isRepostLoading: res.isLoading,
        fetchRepostError: res.error
      }
    },

    /** Editar un post */
    editPost: (params: EditPostProps) => {
      const {postData, updatedTextContent, setTextContent, setIsEditingPost, searchTerm} = params;

      const {mutate, isPending} = useMutation({
        mutationFn: async () => {
          if (!postData) return;

          const token = await getToken();

          return axiosInstance({
            method: "PUT",
            url: `/posts/${postData._id}`,
            data: {
              content: updatedTextContent
            },
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            }
          });
        },
        onSuccess: async () => {
          await queryClient.invalidateQueries({queryKey: ["posts"]});

          await queryClient.invalidateQueries({queryKey: ["likes", "likedPosts"]});

          if (searchTerm) {
            await queryClient.invalidateQueries({queryKey: ["search", searchTerm, "posts"]});
          }

          setIsEditingPost(false);
        },
        onError: (error) => {
          const message = errorMessage(error);
          toast.error(message);
          setTextContent(postData!.content);
        }
      });

      return {
        mutate,
        isPending
      }
    },

    /** Eliminar un post */
    deletePost: (params: DeletePostProps) => {
      const {postId, pathname, searchTerm, setIsDeleting, setIsOpen} = params;

      const deletePost = async () => {
        const token = await getToken();

        return axiosInstance({
          method: "DELETE",
          url: `/posts/${postId}`,
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      }

      const {mutate, isPending} = useMutation({
        mutationFn: deletePost,
        onSuccess: async () => {
          // Si se está en la página del post, redirigir a la página principal
          if (pathname === `/post/${postId}`) {
            toast.success("Post eliminado con éxito.");
            return navigate("/", {replace: true});
          }

          await queryClient.invalidateQueries({queryKey: ["posts"]});

          if (searchTerm) {
            await queryClient.invalidateQueries({queryKey: ["search", searchTerm, "posts"]});
          }

          toast.success("Post eliminado con éxito.");
          
          setIsOpen(false);
        },
        onError: (error) => {
          const message = errorMessage(error);
          toast.error(message);
        },
        onSettled: () => {
          setIsDeleting(false);
        }
      });

      return {
        mutate,
        isPending
      }
    }
  }
}