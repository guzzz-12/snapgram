import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPrivateChatByParticipant } from "@/repositories/chatsRepository";
import { restoreDeletedChatCache } from "@/utils/updateMsgsDataCache";

/** Hook para consultar el chat con el usuario seleccionado */
const getPrivateChatByRecipient = (selectedUserId: string | null | undefined) => {
  const queryClient = useQueryClient();

  const res = useQuery({
    queryKey: ["get-private-chat-by-participant", selectedUserId],
    queryFn: async () => fetchPrivateChatByParticipant({selectedUserId}),
    enabled: !!selectedUserId
  });

  const {data, refetch, isRefetching: isLoadingChat, error: loadingChatError} = res;

  // Agregar el nuevo chat a la lista de chats del usuario recipiente
  // al recibir el primer mensaje de un chat que aun no existe en su lista
  if (data && data.isChatRestored) {
    restoreDeletedChatCache({queryClient, restoredChat: data.data});
  }

  return {refetch, isLoadingChat, loadingChatError};
}

export default getPrivateChatByRecipient;