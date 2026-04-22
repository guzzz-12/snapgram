import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchUserLikedPosts } from "@/repositories/profileRepository";
import type { UserType } from "@/types/global";

/** Hook para consultar los posts gustados del usuario */
const useGetUserLikedPosts = (userData: UserType | null) => {
  const res = useInfiniteQuery({
    queryKey: ["likes", "likedPosts"],
    queryFn: ({pageParam}) => fetchUserLikedPosts(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
    refetchOnWindowFocus: false,
    enabled: !!userData,
    retry: 2,
  });

  const {data, error, isLoading, isRefetching, isFetchingNextPage, hasNextPage, fetchNextPage, refetch} = res;

  const likedPosts = data?.pages.flatMap(page => page.data) ?? [];

  return {
    data: likedPosts,
    error,
    isLoading,
    isRefetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch
  }
}

export default useGetUserLikedPosts;