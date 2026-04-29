import { axiosInstance } from "@/utils/axiosInstance";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type SharePostProps = {
  repostedPostId: string;
  textContent: string;
  onSuccess?: () => void;
  onError: (error: Error, type: "share" | "create") => void;
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
    onError: (error, vars) => {
      vars.onError(error, "share");
    }
  });

  return {
    repostMutation: mutate,
    isRepostPending: isPending,
    repostError: error
  }
}

export default useSharePost;