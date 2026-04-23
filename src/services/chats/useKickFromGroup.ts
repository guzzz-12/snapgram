import { useQueryClient, useMutation } from "@tanstack/react-query";
import { axiosInstance } from "@/utils/axiosInstance";
import { toast } from "sonner";
import { useLeaveOrKickUser } from "@/hooks/useLeaveOrKickUser";
import { errorMessage } from "@/utils/errorMessage";
import type { ChatType } from "@/types/global";

type Props = {
  chatData: ChatType | null | undefined;
}

/** Expulsar un miembro del chat grupal */
const useKickFromGroup = ({chatData}: Props) => {
  const {modalState, setModalState} = useLeaveOrKickUser();
  const queryClient = useQueryClient();

  const {mutate: kickUser, isPending: isKicking} = useMutation({
    mutationFn: async () => {
      const {data} = await axiosInstance<{data: ChatType}>({
        method: "PUT",
        url: `/chats/group/${chatData?._id}/kick`,
        headers: {
          "Content-Type": "application/json"
        },
        data: {
          participantId: modalState.kickedUser?._id
        }
      });

      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ["groupInfo", chatData?._id]});
      await queryClient.invalidateQueries({queryKey: ["recipientsCryptoKeys", chatData?._id]});
      toast.success(`Has expulsado a ${modalState.kickedUser?.fullName.split(" ")[0]} del grupo`);
      setModalState({operation: null, kickedUser: undefined, isOpen: false});
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    }
  });

  return {
    kickUser,
    isKicking
  }
}

export default useKickFromGroup;