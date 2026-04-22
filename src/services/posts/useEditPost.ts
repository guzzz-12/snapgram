import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import type { PostWithLikes } from "@/types/global";

export type EditPostProps = {
  postData: PostWithLikes;
  updatedTextContent: string;
  searchTerm: string | null;
  onSuccess?: () => void;
}

/** Hook para editar un post */
const useEditPost = () => {
  const queryClient = useQueryClient();

  const {mutate, isPending} = useMutation({
    mutationFn: async (params: EditPostProps) => {
      const {postData, updatedTextContent} = params;

      if (!postData) return;

      return axiosInstance({
        method: "PUT",
        url: `/posts/${postData._id}`,
        data: {
          content: updatedTextContent
        },
        headers: {
          "Content-Type": "application/json"
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
}

export default useEditPost;