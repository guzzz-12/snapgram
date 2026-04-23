import { useMutation } from "@tanstack/react-query";
import { encryptEditedMessage } from "@/utils/encryptEditedMessage";
import { axiosInstance } from "@/utils/axiosInstance";
import type { MessageType, UserType } from "@/types/global";

type Props = {
  message: MessageType | null | undefined;
  messageText: string;
  currentUser: UserType | null | undefined;
  onSuccess: () => void;
  onError: (error: Error) => void;
}


const useEditMessage = (props: Props) => {
  const {message, messageText, currentUser, onSuccess, onError} = props;

  const {mutate: updateMessage, isPending: isSubmitting} = useMutation({
    mutationFn: async () => {
      if (!message || !currentUser) return;

      if (messageText === message.text) return message;

      // Encriptar el texto del mensaje editado
      const {updatedMsgEncrypted, updatedIv} = await encryptEditedMessage({
        updatedText: messageText,
        message,
        currentUserId: currentUser._id
      });

      const {data} = await axiosInstance<{data: MessageType}>({
        method: "PUT",
        url: `/messages/edit/${message.chat}/${message._id}`,
        data: {
          text: updatedMsgEncrypted,
          iv: updatedIv
        },
        headers: {
          "Content-Type": "application/json"
        }
      });

      return data;
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (error) => {
      onError(error);
    }
  });

  return {
    updateMessage,
    isSubmitting
  };
}

export default useEditMessage;