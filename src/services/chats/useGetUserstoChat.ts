import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchUsersToChat } from "@/repositories/chatsRepository";

/** Service para consultar los usuarios que pueden ser agregados al chat */
const useGetUsersToChat = ({ isOpen, keyword }: { isOpen: boolean; keyword?: string }) => {

  const res = useInfiniteQuery({
    queryKey: ["get-users-list", keyword],
    initialPageParam: 1,
    queryFn: ({pageParam}) => fetchUsersToChat(pageParam, keyword),
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
    refetchOnWindowFocus: false,
    enabled: isOpen
  });

  const usersData = res.data?.pages.flatMap((page) => page.data) ?? [];

  return {
    usersData,
    usersError: res.error,
    isLoading: res.isLoading,
    isFetchingNextPage: res.isFetchingNextPage,
    hasNextPage: res.hasNextPage,
    fetchNextPage: res.fetchNextPage
  };
}

export default useGetUsersToChat;