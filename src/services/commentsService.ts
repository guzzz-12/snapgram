import { useAuth } from "@clerk/clerk-react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import type { Comment } from "@/types/global";

/** Service para el manejo de comentarios */
export const useCommentsService = () => {
  const { getToken } = useAuth();

  const queryClient = useQueryClient();

  return {
    /** Consultar y paginar los comentarios de un post */
    getPostComments: (props: {postId: string | undefined; enabled: boolean}) => {
      const {postId, enabled} = props;

      const res = useInfiniteQuery({
        queryKey: ["postComments", postId],
        queryFn: async ({ pageParam }) => {
          const token = await getToken();
  
          const {data} = await axiosInstance<{
            data: Comment[];
            hasMore: boolean;
            nextPage: number | null;
          }>({
            method: "GET",
            url: `/comments/posts/${postId}`,
            headers: {
              Authorization: `Bearer ${token}`
            },
            params: {
              page: pageParam,
              limit: 5
            }
          });

          return data;
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
        refetchOnWindowFocus: false,
        enabled
      });

      const {data, error, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} = res;

      const comments = data?.pages.flatMap(page => page.data) || [];
      const loadingComments = isLoading || isFetchingNextPage;

      return {
        comments,
        commentsError: error,
        loadingComments,
        hasNextPage,
        fetchNextPage
      }
    },

    /** Actualizar un comentario */
    updateCommentFn: () => {
      const {mutate, isPending: isUpdating} = useMutation({
        mutationFn: async (props: {commentData: Comment; commentText: string; onSuccess?: () => void}) => {
          const {commentData, commentText} = props;

          const token = await getToken();

          return axiosInstance({
            method: "PUT",
            url: `/comments/${commentData._id}`,
            data: {
              content: commentText
            },
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            }
          });
        },
        onSuccess: async (_, variables) => {
          await queryClient.invalidateQueries({
            queryKey: ["postComments", variables.commentData.post._id]
          });

          variables.onSuccess?.();
        },
        onError: (error) => {
          const message = errorMessage(error);
          toast.error(message);
        }
      });

      return {
        updateCommentMutation: mutate,
        isUpdating
      }
    },

    /** Eliminar un comentario */
    deleteCommentFn: () => {
      const {mutate, isPending: isDeleting} = useMutation({
        mutationFn: async (props: {commentData: Comment; onSuccess?: () => void}) => {
          const {commentData} = props;

          const token = await getToken();

          return axiosInstance({
            method: "DELETE",
            url: `/comments/${commentData._id}`,
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
        },
        onSuccess: async (_, variables) => {
          await queryClient.invalidateQueries({
            queryKey: ["postComments", variables.commentData.post._id]
          });

          await queryClient.invalidateQueries({
            queryKey: ["commentReplies", variables.commentData._id]
          });

          variables.onSuccess?.();
        },
        onError: (error) => {
          const message = errorMessage(error);
          toast.error(message);
        }
      });

      return {
        deleteCommentMutation: mutate,
        isDeleting
      }
    },

    /** Crear comementario o responder a un comentario */
    createCommentFn: () => {
      const {mutate, isPending: isCreatingComment} = useMutation({
        mutationFn: async (props: {postId: string; parentId: string; replyText: string, onSuccess?: () => void}) => {
          const {postId, parentId, replyText} = props;

          const token = await getToken();

          return axiosInstance({
            method: "POST",
            url: `/comments/posts/${postId}`,
            data: {
              content: replyText,
              parentId
            },
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            }
          });
        },
        onSuccess: async (_, variables) => {
          await queryClient.invalidateQueries({
            queryKey: ["postComments", variables.postId]
          });

          if (variables.parentId) {
            await queryClient.invalidateQueries({
              queryKey: ["commentReplies", variables.parentId]
            });
          }

          variables.onSuccess?.();
        },
        onError: (error) => {
          const message = errorMessage(error);
          toast.error(message);
        }
      });

      return {
        createCommentMutation: mutate,
        isCreatingComment
      }
    },

    /** Consultar y paginar las respuestas de un comentario */
    getCommentRepliesFn: (commentId: string, openReplies: boolean) => {
      type PaginatedReplies = {
        data: Comment[];
        hasMore: boolean;
        nextPage: number | null;
      }

      const res = useInfiniteQuery({
        queryKey: ["commentReplies", commentId],
        queryFn: async ({ pageParam }) => {
          const token = await getToken();

          const {data} = await axiosInstance<PaginatedReplies>({
            method: "GET",
            url: `/comments/replies/comment/${commentId}`,
            headers: {
              Authorization: `Bearer ${token}`
            },
            params: {
              page: pageParam,
              limit: 5
            }
          });

          return data;
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
        enabled: openReplies,
        refetchOnWindowFocus: false,
        staleTime: 0
      });

      const {data: repliesData, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} = res;

      const commentReplies = repliesData?.pages.flatMap((page) => page.data) ?? [];

      return {
        commentReplies,
        isLoading,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage
      }
    }
  }
}