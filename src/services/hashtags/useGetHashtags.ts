import { useInfiniteQuery } from "@tanstack/react-query";
import { axiosInstance } from "@/utils/axiosInstance";
import type { HashtagWithPostsCount } from "@/types/global";

/** Consultar los hashtags */
const useGetHashtags = (props: {value: string; enabled: boolean}) => {
  const {value, enabled} = props;

  const {data, isLoading, error: hashtagsError, isEnabled, isRefetching, isFetchingNextPage, hasNextPage, fetchNextPage, refetch} = useInfiniteQuery({
    queryKey: ["hashtags", value],
    queryFn: async ({pageParam = 1}) => {
      const {data} = await axiosInstance<{
        data: HashtagWithPostsCount[];
        hasMore: boolean;
        nextPage: number | null;
      }>({
        method: "GET",
        url: "/hashtags",
        headers: {
          "Content-Type": "application/json",
        },
        params: {
          title: value,
          page: pageParam,
          limit: 10
        }
      });

      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
    refetchOnWindowFocus: false,
    enabled,
    retry: 2
  });

  return {data, isLoading, error: hashtagsError, isEnabled, isRefetching, isFetchingNextPage, hasNextPage, fetchNextPage, refetch}
}

export default useGetHashtags;