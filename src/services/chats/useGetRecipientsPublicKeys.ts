import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { axiosInstance } from "@/utils/axiosInstance";
import type { PublicKeysType } from "@/repositories/chatsRepository";
import type { ChatType } from "@/types/global";

/** Hook para consultar las claves publicas de los miembros del chat */
const useGetRecipientsPublicKeys = (chat: ChatType | null | undefined) => {
  const isNotTempChat = Boolean(chat && !chat._id.startsWith("temp_"));

  const {getToken} = useAuth();

  const res = useQuery({
    queryKey: ["recipientsCryptoKeys", chat?._id],
    queryFn: async () => {
      const token = await getToken();

      const {data} = await axiosInstance<{publicKeys: PublicKeysType[]}>({
        method: "GET",
        url: `/crypto-keys/get-recipients-public-keys/${chat?._id}`,
        headers: {
          Authorization: `Bearer ${token}`
        }
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