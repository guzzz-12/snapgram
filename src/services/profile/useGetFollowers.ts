import { useAuth } from "@clerk/clerk-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchFollowers } from "@/repositories/profileRepository";
import type { UserType } from "@/types/global";

/** Hook para consultar los seguidores del usuario */
const useGetFollowers = (userData: UserType | null) => {
  const {getToken} = useAuth();

  const res = useInfiniteQuery({
    queryKey: ["followers", userData?._id],
    queryFn: async ({pageParam}) => fetchFollowers({userId: userData?._id, page: pageParam, getToken}),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
    refetchOnWindowFocus: false,
    enabled: !!userData
  });

  const {data, error, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} = res;

  const followers = data?.pages.flatMap(page => page.data) ?? [];

  return {
    data: followers,
    error,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage
  }
}

export default useGetFollowers;