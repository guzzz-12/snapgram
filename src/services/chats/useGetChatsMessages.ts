import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { fetchChatMessages } from "@/repositories/chatsRepository";

/** Service para consultar los mensajes de un chat */
const useGetChatsMessages = (params: { chatId: string | undefined; isLoadingChatData: boolean}) => {
  const {chatId, isLoadingChatData} = params;

  const { getToken } = useAuth();

  const res = useInfiniteQuery({
    queryKey: ["messages", chatId],
    queryFn: ({pageParam}) => fetchChatMessages(chatId, pageParam, getToken),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
    enabled: !isLoadingChatData && !!chatId && !chatId.startsWith("temp_"),
    retry: 2,
    refetchOnWindowFocus: false,
  });

  const {data: messagesData, isLoading: isLoadingMessages, isFetchingNextPage, hasNextPage, fetchNextPage, error} = res;

  // Invertir el orden de los mensajes
  // para corregir la dirección de la paginación
  const messages = messagesData?.pages.flatMap((page) => page.data.messages).reverse() || [];

  return {
    messages,
    isLoadingMessages,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error
  };
}

export default useGetChatsMessages;