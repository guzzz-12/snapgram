import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { axiosInstance } from "@/utils/axiosInstance";
import type { ChatType, UserType } from "@/types/global";
import { errorMessage } from "@/utils/errorMessage";

type Props = {
  chatData: ChatType | null | undefined;
  currentUser: UserType | null | undefined;
  onSuccess: () => void;
}

/** Eliminar un chat privado */
const useDeletePrivateChat = (props: Props) => {
  const { chatData, currentUser, onSuccess } = props;

  const queryClient = useQueryClient();

  const {mutate, isPending} = useMutation({
    mutationFn: async () => {
      if (!chatData || !currentUser) return;

      const {data} = await axiosInstance<{data: {chat: string}}>({
        method: "DELETE",
        url: `/chats/private/${chatData._id}`
      });

      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ["chats", "all"]});

      onSuccess();
    },
    onError: (error) => {
      const message = errorMessage(error);
      toast.error(message);
    }
  });

  return {
    mutate,
    isPending
  }
}

export default useDeletePrivateChat;