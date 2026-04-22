import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";

/** Hook para seguir o dejar de seguir a un usuario */
const useFollowOrUnfollowUser = (
  followedUserId: string | undefined,
  currentUserClerkId: string | null | undefined
) => {

  const queryClient = useQueryClient();

  const {mutate, isPending} = useMutation({
    mutationFn: async () => {
      if (!currentUserClerkId) return;

      return axiosInstance({
        method: "POST",
        url: `/follows/follow-or-unfollow`,
        data: {
          userId: followedUserId
        }
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ["user", currentUserClerkId]});
      await queryClient.invalidateQueries({queryKey: ["followers"]});
      await queryClient.invalidateQueries({queryKey: ["following"]});
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    }
  });

  return {mutate, isPending};
}

export default useFollowOrUnfollowUser;