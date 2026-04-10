import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import type { Comment } from "@/types/global";

/** Eliminar un comentario */
const useDeleteComment = () => {
  const {getToken} = useAuth();

  const queryClient = useQueryClient();

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
}

export default useDeleteComment;