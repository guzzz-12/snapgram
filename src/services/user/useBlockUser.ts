import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { axiosInstance } from "@/utils/axiosInstance";
import type { UserType } from "@/types/global";
import { errorMessage } from "@/utils/errorMessage";

type Props = {
  blockedUser: UserType | null | undefined;
  onSuccess: () => void;
}

/** Hook para bloquear o desbloquear un usuario */
const useBlockUser = ({blockedUser, onSuccess}: Props) => {
  const queryClient = useQueryClient();

  const {mutate, isPending} = useMutation({
    mutationFn: async () => {
      if (!blockedUser) return;

      const {data} = await axiosInstance<{
        data: {
          user: UserType;
          operation: "block" | "unblock";
          chatId: string | null;
        }
      }>({
        method: "PUT",
        url: "/block",
        data: {
          blockedUserId: blockedUser._id
        }
      });

      const message = data.data.operation === "block" ? `Bloqueaste a ${blockedUser.fullName.split(" ")[0]}` : `Desbloqueaste a ${blockedUser.fullName.split(" ")[0]}`;

      toast.success(message);

      return data;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({queryKey: ["blocked-users"]});

      await queryClient.invalidateQueries({queryKey: ["user", data?.data.user.clerkId]});

      // Invalidar la cache del chat con el usuario bloqueado/desbloqueado
      if (data && data.data.chatId) {
        await queryClient.invalidateQueries({queryKey: ["chat", data.data.chatId]});
      }

      onSuccess();
    },
    onError: (error) => {
      const message = errorMessage(error);
      toast.error(message);
    }
  });

  return {mutate, isPending};
}

export default useBlockUser;