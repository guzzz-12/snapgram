import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";

/** Crear comementario o responder a un comentario */
const useCreateComment = () => {
  const queryClient = useQueryClient();

  const {mutate, isPending: isCreatingComment} = useMutation({
    mutationFn: async (props: {postId: string; formData: FormData; onSuccess?: () => void}) => {
      const {postId, formData} = props;

      return axiosInstance({
        method: "POST",
        url: `/comments/posts/${postId}`,
        data: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        }
      });
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({queryKey: ["posts"]});

      await queryClient.invalidateQueries({
        queryKey: ["postComments", variables.postId]
      });

      const parentId = variables.formData.get("parentId");

      if (parentId) {
        await queryClient.invalidateQueries({
          queryKey: ["commentReplies", parentId.toString()]
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
}

export default useCreateComment;