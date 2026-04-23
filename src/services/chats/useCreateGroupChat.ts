import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createGroupChatFn } from "@/repositories/chatsRepository";
import { errorMessage } from "@/utils/errorMessage";

/** Hook para crear un chat grupal */
const useCreateGroupChat = () => {
  const navigate = useNavigate();

  const queryClient = useQueryClient();

  const {mutate, isPending} = useMutation({
    mutationFn: createGroupChatFn,
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({queryKey: ["chats", "all"]});
      navigate(`/messages/${data?.data._id}`);
    },
    onError: (error: any) => {
      toast.error(errorMessage(error));
    }
  });

  return {
    createGroupChatMutation: mutate,
    isCreatingGroup: isPending
  };
};

export default useCreateGroupChat;