import { useAuth } from "@clerk/clerk-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchChats } from "@/repositories/chatsRepository";

/** Hook para consultar los chats del usuario */
const useGetChats = (
  chatTypeParam: "all" | "group" | null | undefined,
  chatId: string | undefined,
  hasLocalCryptoKeys: boolean
) => {
  const { getToken } = useAuth();

  const res = useInfiniteQuery({
    queryKey: ["chats", chatTypeParam || "all"],
    queryFn: ({pageParam}) => fetchChats(pageParam, chatTypeParam, getToken),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
    refetchOnWindowFocus: false,
    enabled: hasLocalCryptoKeys && (!!chatTypeParam || !!chatId)
  });

  const {data, error, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} = res;

  const chats = data?.pages.flatMap((page) => page.data) || [];

  return {chats, error, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage};
}

export default useGetChats;