import { useQuery } from "@tanstack/react-query";
import type { ChatType } from "@/types/global";
import { axiosInstance } from "@/utils/axiosInstance";

/** Hook para consultar la información de un grupo */
const useGetGroupInfo = (groupId: string | undefined, isOpen: boolean) => {

  const res = useQuery({
    queryKey: ["groupInfo", groupId],
    queryFn: async () => {
      
      const {data} = await axiosInstance<{data: ChatType}>({
        method: "GET",
        url: `/chats/${groupId}`
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