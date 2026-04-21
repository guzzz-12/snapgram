import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { axiosInstance } from "@/utils/axiosInstance";

type Props = {
  enabled: boolean;
}

/** Hook para consultar el número de chats sin leer */
const useGetUnreadChats = (props: Props) => {
  const { enabled } = props;

  const { getToken } = useAuth();

  const { data: unreadChatsIds, isLoading: loadingUnreadChats } = useQuery({
    queryKey: ["unreadChatsIds"],
    queryFn: async () => {
      const token = await getToken();

      const { data } = await axiosInstance<{ data: string[] }>({
        method: "GET",
        url: "/chats/get-unread-chats",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return data.data;
    },
    enabled,
    retry: 2,
    refetchOnWindowFocus: false
  });

  return {
    unreadChatsIds,
    loadingUnreadChats
  }
}

export default useGetUnreadChats;