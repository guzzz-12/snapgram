import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { errorMessage } from "@/utils/errorMessage";
import { axiosInstance } from "@/utils/axiosInstance";
import type { MessageType } from "@/types/global";

const useDeleteMessage = ({message}: {message: MessageType | null | undefined}) => {
  const {mutate, isPending} = useMutation({
    mutationFn: async (deleteFor: "me" | "all") => {
      if (!message) return;

      const {data} = await axiosInstance<{data: MessageType}>({
        method: "DELETE",
        url: `/messages/delete/${message.chat}/${message._id}`,
        params: {
          deleteFor
        }
      });

      return data;
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    }
  });

  return {
    mutate,
    isPending
  }
}

export default useDeleteMessage;