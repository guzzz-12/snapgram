import { useQuery } from "@tanstack/react-query";
import { fetchChatById } from "@/repositories/chatsRepository";

/** Hook para consultar un chat especifico por su ID */
const useGetChatById = (chatId: string | undefined) => {
  const res = useQuery({
    queryKey: ["chat", chatId],
    queryFn: () => fetchChatById(chatId),
    enabled: !!chatId && !chatId.startsWith("temp_"),
    refetchOnWindowFocus: false
  });

  const {data, isFetching, error} = res;

  return {
    existingChat: data?.chatData,
    blockData: data?.isBlocked,
    fetchingExistingChat: isFetching,
    chatError: error
  };
}

export default useGetChatById;