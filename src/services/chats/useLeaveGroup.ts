import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLeaveOrKickUser } from "@/hooks/useLeaveOrKickUser";
import { axiosInstance } from "@/utils/axiosInstance";
import type { ChatType, UserType } from "@/types/global";
import { errorMessage } from "@/utils/errorMessage";

type Props = {
  chatData: ChatType | null | undefined;
  currentUser: UserType | null | undefined;
}

/** Abandonar un chat grupal */
const useLeaveGroup = (props: Props) => {
  const {chatData, currentUser} = props;

  const navigate = useNavigate();

  const queryClient = useQueryClient();

  const {setModalState} = useLeaveOrKickUser();

  const {mutate: leaveGroup, isPending: isLeaving} = useMutation({
    mutationFn: async () => {
      if (!chatData || !currentUser) return;

      const {data} = await axiosInstance<{data: ChatType}>({
        method: "PUT",
        url: `/chats/group/${chatData._id}/leave`
      });

      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ["chats", "all"]});
      await queryClient.invalidateQueries({queryKey: ["recipientsCryptoKeys", chatData?._id]});
      setModalState({operation: null, isOpen: false});
      navigate("/messages?type=all", {replace: true});
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    }
  });

  return {
    leaveGroup,
    isLeaving
  }
}

export default useLeaveGroup;