import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import type { Comment } from "@/types/global";

/** Actualizar un comentario */
const useUpdateComment = () => {
  const {getToken} = useAuth();

  const queryClient = useQueryClient();

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
}

export default useUpdateComment;