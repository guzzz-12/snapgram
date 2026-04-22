import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchChats } from "@/repositories/chatsRepository";

/** Hook para consultar los chats del usuario */
const useGetChats = (
  chatTypeParam: "all" | "group" | null | undefined,
  chatId: string | undefined,
  hasLocalCryptoKeys: boolean
) => {
  const res = useInfiniteQuery({
    queryKey: ["chats", chatTypeParam || "all"],
    queryFn: ({pageParam}) => fetchChats(pageParam, chatTypeParam),
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