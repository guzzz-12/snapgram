import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";

/** Hook para seguir o dejar de seguir a un usuario */
const useFollowOrUnfollowUser = (
  followedUserId: string | undefined,
  currentUserClerkId: string | null | undefined
) => {
  const {getToken} = useAuth();

  const queryClient = useQueryClient();

  const {mutate, isPending} = useMutation({
    mutationFn: async () => {
      const token = await getToken();

      if (!currentUserClerkId) return;

      return axiosInstance({
        method: "POST",
        url: `/follows/follow-or-unfollow`,
        data: {
          userId: followedUserId
        },
        headers: {
          Authorization: `Bearer ${token}`
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