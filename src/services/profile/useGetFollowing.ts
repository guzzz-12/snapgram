import { useAuth } from "@clerk/clerk-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { UserType } from "@/types/global";
import { fetchFollowing } from "@/repositories/profileRepository";

/** Hook para consultar los seguidos del usuario */
const useGetFollowing = (userData: UserType | null) => {
  const res = useInfiniteQuery({
    queryKey: ["following", userData?._id],
    queryFn: async ({pageParam}) => fetchFollowing({userId: userData?._id, page: pageParam}),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
    refetchOnWindowFocus: false,
    enabled: !!userData
  });

  const {data, error, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} = res;

  const following = data?.pages.flatMap(page => page.data) ?? [];

  return {
    data: following,
    error,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage
  }
}

export default useGetFollowing;