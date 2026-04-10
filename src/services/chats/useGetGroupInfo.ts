import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import type { ChatType } from "@/types/global";
import { axiosInstance } from "@/utils/axiosInstance";

/** Hook para consultar la información de un grupo */
const useGetGroupInfo = (groupId: string | undefined, isOpen: boolean) => {
  const {getToken} = useAuth();

  const res = useQuery({
    queryKey: ["groupInfo", groupId],
    queryFn: async () => {
      const token = await getToken();
      
      const {data} = await axiosInstance<{data: ChatType}>({
        method: "GET",
        url: `/chats/${groupId}`,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return data.data;
    },
    enabled: isOpen && !!groupId
  });

  return {
    data: res.data,
    isLoading: res.isLoading,
    error: res.error
  }
}

export default useGetGroupInfo;