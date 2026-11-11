import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { PublicKeysType } from "@/repositories/chatsRepository";
import type { ChatType } from "@/types/global";
import { axiosInstance } from "@/utils/axiosInstance";

/** Hook para consultar la clave publica del chat temporal */
const useGetTempChatPublicKey = (chat: ChatType | null | undefined) => {
  const chatId = chat?._id;
  const isTempChat = Boolean(chatId && chatId.startsWith("temp_"));

  const selectPublicKey = useCallback(
    (response: {data: JsonWebKey}): PublicKeysType[] | undefined => {
      if (!chatId) return undefined;
      return [{publicKey: response.data, userId: chatId}];
    },
    [chatId]
  );

  const { data: tempChatPublicKey, isLoading } = useQuery({
    queryKey: ["tempChatPublicKey", chatId],
    queryFn: async () => {
      const {data} = await axiosInstance<{data: JsonWebKey}>({
        method: "GET",
        url: `/crypto-keys/get-user-public-key/${chatId!.replace("temp_", "")}`
      });

      return data;
    },
    select: selectPublicKey,
    enabled: isTempChat,
    retry: 1,
    refetchOnWindowFocus: false
  });

  return {
    tempChatPublicKey,
    loadingTempChatPublicKey: isLoading
  };
};

export default useGetTempChatPublicKey;