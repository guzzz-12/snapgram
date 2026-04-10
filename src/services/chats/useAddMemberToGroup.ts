import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { addMemberToGroupFn } from "@/repositories/chatsRepository";
import { errorMessage } from "@/utils/errorMessage";

/** Hook para agregar un nuevo miembro al grupo */
const addMemberToGroup = (params: {chatId: string | undefined; selectedUserId: string | null}) => {
  const {chatId, selectedUserId} = params;

  const {getToken} = useAuth();

  const queryClient = useQueryClient();

  const {mutate, isPending} = useMutation({
    mutationFn: async (_props: {onSuccess?: () => void}) => addMemberToGroupFn({chatId, selectedUserId, getToken}),
    onSuccess: async (_data, {onSuccess}) => {
      await queryClient.invalidateQueries({queryKey: ["recipientsCryptoKeys", chatId]});

      onSuccess?.();
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    }
  });

  return {mutate, isPending};
}

export default addMemberToGroup;