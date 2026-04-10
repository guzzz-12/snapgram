import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { fetchChatById } from "@/repositories/chatsRepository";

/** Hook para consultar un chat especifico por su ID */
const useGetChatById = (chatId: string | undefined) => {
  const { getToken } = useAuth();

  const res = useQuery({
    queryKey: ["chat", chatId],
    queryFn: () => fetchChatById(chatId, getToken),
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