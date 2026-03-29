import type { RefObject } from "react";
import { useNavigate } from "react-router";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";
import { createPostFn, fetchPosts, getPost } from "@/repositories/postsRepository";
import { errorMessage } from "@/utils/errorMessage";
import { axiosInstance } from "@/utils/axiosInstance";
import type { PostType, PostWithLikes, UserType } from "@/types/global";

type GetPostProps = {
  postId: string | undefined;
}

type CreatePostProps = {
  user: UserType | null;
  searchTerm: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  textContent: string;
  selectedImageFiles: File[];
  onSuccess?: () => void;
}

type SharePostProps = {
  repostedPostId: string;
  textContent: string;
  onSuccess?: () => void;
}

export type EditPostProps = {
  postData: PostWithLikes;
  updatedTextContent: string;
  searchTerm: string | null;
  onSuccess?: () => void;
}

type DeletePostProps = {
  postId: string;
  pathname: string | undefined;
  searchTerm: string | null;
  onSuccess?: () => void;
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
    createPost: () => {
      const {mutate, isPending} = useMutation({
        mutationFn: async (props: CreatePostProps) => createPostFn({
          user: props.user,
          textContent: props.textContent,
          selectedImageFiles: props.selectedImageFiles,
          getToken
        }),
        onSuccess: async (_data, vars) => {
          await queryClient.invalidateQueries({queryKey: ["posts"]});

          if (vars.searchTerm) {
            await queryClient.invalidateQueries({queryKey: ["search", vars.searchTerm, "posts"]});
          }

          vars.onSuccess?.();
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
    sharePost: () => {
      const {mutate, isPending, error} = useMutation({
        mutationFn: async (params: SharePostProps) => {
          if (!params.repostedPostId) return;

          const token = await getToken();

          const {data} = await axiosInstance({
            method: "POST",
            url: `/posts/share/${params.repostedPostId}`,
            data: {
              content: params.textContent
            },
            headers: {
              Authorization: `Bearer ${token}`
            }
          });

          return data;
        },
        onSuccess: async (_data, vars) => {
          await queryClient.invalidateQueries({queryKey: ["posts"]});

          vars.onSuccess?.();
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
    editPost: () => {
      const {mutate, isPending} = useMutation({
        mutationFn: async (params: EditPostProps) => {
          const {postData, updatedTextContent} = params;

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
        onSuccess: async (_data, vars) => {
          await queryClient.invalidateQueries({queryKey: ["posts"]});

          await queryClient.invalidateQueries({queryKey: ["likes", "likedPosts"]});

          if (vars.searchTerm) {
            await queryClient.invalidateQueries({queryKey: ["search", vars.searchTerm, "posts"]});
          }

          vars.onSuccess?.();
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

    /** Eliminar un post */
    deletePost: () => {
      const {mutate, isPending} = useMutation({
        mutationFn: async (params: DeletePostProps) => {
          const token = await getToken();

          return axiosInstance({
            method: "DELETE",
            url: `/posts/${params.postId}`,
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
        },
        onSuccess: async (_data, vars) => {
          vars.onSuccess?.();

          // Si se está en la página del post, redirigir a la página principal
          if (vars.pathname === `/post/${vars.postId}`) {
            navigate("/", {replace: true});

          } else {
            // Invalidar los queries de los posts
            await queryClient.invalidateQueries({queryKey: ["posts"]});
  
            if (vars.searchTerm) {
              await queryClient.invalidateQueries({queryKey: ["search", vars.searchTerm, "posts"]});
            }
          }
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
    }
  }
}