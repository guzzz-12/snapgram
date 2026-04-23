import { useInfiniteQuery } from "@tanstack/react-query";
import type { LikeType } from "@/types/global";
import { axiosInstance } from "@/utils/axiosInstance";

type Props = {
  itemId: string;
  enabled: boolean;
}

/** Consultar los likes de un post */
const useGetPostLikes = ({itemId, enabled}: Props) => {
  const {data, error, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} = useInfiniteQuery({
    queryKey: ["likes", "post", itemId],
    queryFn: async ({pageParam = 1}) => {
      const {data} = await axiosInstance<{
        data: LikeType[];
        hasMore: boolean;
        nextPage: number | null;
      }>({
        method: "GET",
        url: `/likes/post/${itemId}`,
        params: {
          limit: 5,
          page: pageParam
        }
      });

      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
    refetchOnWindowFocus: false,
    enabled,
  });

  const likes = data?.pages.flatMap((page) => page.data) ?? [];

  return {
    likes,
    error,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage
  }
}

export default useGetPostLikes;