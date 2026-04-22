import { useInfiniteQuery } from "@tanstack/react-query";
import type { UsersHavingStories } from "@/types/global";
import { axiosInstance } from "@/utils/axiosInstance";

/** Hook para consultar los usuarios que tienen stories activas */
const useGetUsersHavingStories = () => {
  const res = useInfiniteQuery({
    queryKey: ["stories"],
    queryFn: async ({ pageParam }) => {
      const { data } = await axiosInstance<{
        data: UsersHavingStories[];
        hasMore: boolean;
        nextPage: number | null;
      }>({
        method: "GET",
        url: "/stories",
        params: {
          page: pageParam,
          limit: 10
        }
      });

      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
    refetchOnWindowFocus: false
  });

  return {
    data: res.data?.pages.flatMap((page) => page.data) || [],
    error: res.error,
    loading: res.isLoading,
    isFetchingNextPage: res.isFetchingNextPage,
    hasNextPage: res.hasNextPage,
    fetchNextPage: res.fetchNextPage
  };
}

export default useGetUsersHavingStories;