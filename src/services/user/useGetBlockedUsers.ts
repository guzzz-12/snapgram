import { useInfiniteQuery } from "@tanstack/react-query";
import { axiosInstance } from "@/utils/axiosInstance";
import type { UserType } from "@/types/global";

interface Props {
  enabled: boolean;
}

/** Consultar los usuarios bloqueados por el usuario actual */
const useGetBlockedUsers = ({enabled}: Props) => {
  const res = useInfiniteQuery({
    queryKey: ["blocked-users"],
    queryFn: async ({pageParam}) => {
      const {data} = await axiosInstance<{
        data: {
          blockedBy: string;
          blockedUser: UserType;
          createdAt: string;
        }[];
        hasMore: boolean;
        nextPage: number | null;
      }>({
        method: "GET",
        url: "/block",
        params: {
          page: pageParam,
          limit: 10
        }
      });

      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
    enabled
  });

  return {
    blockedUsers: res.data?.pages.flatMap(page => page.data) || [],
    error: res.error,
    isLoading: res.isLoading,
    isFetchingNextPage: res.isFetchingNextPage,
    hasNextPage: res.hasNextPage,
    fetchNextPage: res.fetchNextPage
  }
}

export default useGetBlockedUsers;