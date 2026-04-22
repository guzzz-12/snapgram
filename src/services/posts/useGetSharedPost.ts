import { useQuery } from "@tanstack/react-query";
import type { PostType } from "@/types/global";
import { axiosInstance } from "@/utils/axiosInstance";

/** Hook para consultar un post compartido */
const useGetSharedPost = (
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
      const {data} = await axiosInstance<{data: PostType}>({
        method: "get",
        url: `/posts/${repostedPostId}`
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
}

export default useGetSharedPost;