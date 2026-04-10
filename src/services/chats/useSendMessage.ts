import { useNavigate } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { sendMessageFn, type PublicKeysType } from "@/repositories/chatsRepository";
import { errorMessage } from "@/utils/errorMessage";
import type { ChatType, UserType } from "@/types/global";

type SendMessageParams = {
  chatData: ChatType | null | undefined;
  selectedImageFiles: File[];
  recordedFile: File | null;
  currentUser: UserType | null;
  chatTypeParam: "all" | "group" | null | undefined;
  recipientsPublicKeys: PublicKeysType[];
}

/** Hook para enviar un mensaje en un chat (privado o grupal) */
const useSendMessage = (params: SendMessageParams) => {
  const {
    chatData,
    selectedImageFiles,
    recordedFile,
    currentUser,
    chatTypeParam,
    recipientsPublicKeys
  } = params;

  const navigate = useNavigate();

  const {getToken} = useAuth();

  const queryClient = useQueryClient();

  const {mutate, isPending: submitting} = useMutation({
    mutationKey: ["send-message", chatData?._id],
    mutationFn: async ({messageText}: {messageText: string; onSuccess?: () => void}) => sendMessageFn({
      messageText,
      chatData,
      selectedImageFiles,
      recordedFile,
      getToken,
      currentUser,
      recipientsPublicKeys
    }),
    onSuccess: async (data, {onSuccess}) => {
      onSuccess?.();

      if (data.isNewChat) {
        await queryClient.invalidateQueries({queryKey: ["chats", chatTypeParam || "all"]});

        navigate(`/messages/${data.chat!._id}`, {replace: true});
      }
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });

  return {mutate, submitting};
}

export default useSendMessage;