import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "@/utils/axiosInstance";
import type { PublicKeysType } from "@/repositories/chatsRepository";
import type { ChatType } from "@/types/global";

/** Hook para consultar las claves publicas de los miembros del chat */
const useGetRecipientsPublicKeys = (chat: ChatType | null | undefined) => {
  const isNotTempChat = Boolean(chat && !chat._id.startsWith("temp_"));

  const res = useQuery({
    queryKey: ["recipientsCryptoKeys", chat?._id],
    queryFn: async () => {

      const {data} = await axiosInstance<{publicKeys: PublicKeysType[]}>({
        method: "GET",
        url: `/crypto-keys/get-recipients-public-keys/${chat?._id}`
      });

      return data;
    },
    retry: 1,
    enabled: !!chat && isNotTempChat,
    refetchOnWindowFocus: false
  });

  return {
    publicKeys: res.data?.publicKeys,
    loadingRecipientsCryptoKey: res.isLoading
  };
}

export default useGetRecipientsPublicKeys;