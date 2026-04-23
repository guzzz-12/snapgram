import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import type { UserType } from "@/types/global";

const useDeleteAvatar = ({onSuccess}: {onSuccess: (data: UserType) => void}) => {
  const queryClient = useQueryClient();

  const {mutate, isPending} = useMutation({
    mutationFn: async () => {
      const {data} = await axiosInstance<{data: UserType}>({
        method: "DELETE",
        url: "/users/user-avatar"
      });
  
      return data.data;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({queryKey: ["user", data.clerkId]});
      onSuccess(data);
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    }
  });

  return {
    deleteAvatarMutation: mutate,
    isDeleteAvatarPending: isPending
  }
}

export default useDeleteAvatar;