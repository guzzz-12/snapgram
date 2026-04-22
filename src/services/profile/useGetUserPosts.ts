import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchUserPosts } from "@/repositories/profileRepository";
import type { UserType } from "@/types/global";

const useGetUserPosts = (userData: UserType | null) => {
  const postsData = useInfiniteQuery({
    queryKey: ["posts", userData?.clerkId],
    queryFn: ({pageParam}) => fetchUserPosts({page: pageParam, userId: userData?._id}),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
    refetchOnWindowFocus: false,
    enabled: !!userData,
    retry: 2,
  });

  const {data, error, isLoading, isRefetching, isFetchingNextPage, hasNextPage, fetchNextPage, refetch} = postsData;

  const posts = data?.pages.flatMap((page) => page.data) ?? [];

  return {
    data: posts,
    isLoading,
    isRefetching,
    isFetchingNextPage,
    hasNextPage,
    error,
    fetchNextPage,
    refetch
  }
}

export default useGetUserPosts;