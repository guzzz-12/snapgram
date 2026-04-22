import { axiosInstance } from "@/utils/axiosInstance";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { errorMessage } from "@/utils/errorMessage";

type SharePostProps = {
  repostedPostId: string;
  textContent: string;
  onSuccess?: () => void;
}

/** Hook para compartir un post */
const useSharePost = () => {
  const queryClient = useQueryClient();

  const {mutate, isPending, error} = useMutation({
    mutationFn: async (params: SharePostProps) => {
      if (!params.repostedPostId) return;

        const {data} = await axiosInstance({
        method: "POST",
        url: `/posts/share/${params.repostedPostId}`,
        data: {
          content: params.textContent
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
}

export default useSharePost;