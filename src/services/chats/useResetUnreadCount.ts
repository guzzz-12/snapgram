import { useMutation } from "@tanstack/react-query";
import type { ChatType } from "@/types/global";
import { axiosInstance } from "@/utils/axiosInstance";

interface Props {
  chatData: ChatType;
  onSuccess: (data: ChatType) => void;
}

/** Resetear el contador de mensajes sin leer en un chat */
const useResetUnreadCount = ({chatData, onSuccess}: Props) => {
  const {mutate: resetUnreadMessagesCounter, isPending} = useMutation({
    mutationFn: async () => {
      const {data} = await axiosInstance<{data: ChatType}>({
        method: "PUT",
        url: `/chats/reset-unread-count/${chatData._id}`
      });

      return data;
    },
    onSuccess: ({data}) => {
      onSuccess(data);
    }
  });

  return {resetUnreadMessagesCounter, isPending};
}

export default useResetUnreadCount;