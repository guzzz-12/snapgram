import { useQuery } from "@tanstack/react-query";
import type { ChatType } from "@/types/global";
import { axiosInstance } from "@/utils/axiosInstance";

/** Hook para consultar la clave publica del chat temporal */
const useGetTempChatPublicKey = (chat: ChatType | null | undefined) => {
  const isTempChat = Boolean(chat && chat._id.startsWith("temp_"));

  const {data, isLoading} = useQuery({
    queryKey: ["tempChatPublicKey", chat?._id],
    queryFn: async () => {

      const {data} = await axiosInstance<{data: JsonWebKey}>({
        method: "GET",
        url: `/crypto-keys/get-user-public-key/${chat?._id.replace("temp_", "")}`
      });

      return data;
    },
    enabled: isTempChat,
    retry: 1,
    refetchOnWindowFocus: false
  });

  const publicKey = data ? [{publicKey: data.data, userId: chat!._id}] : undefined;

  return {
    tempChatPublicKey: publicKey,
    loadingTempChatPublicKey: isLoading
  };
}

export default useGetTempChatPublicKey;