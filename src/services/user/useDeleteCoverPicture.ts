import { useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "@/utils/axiosInstance";
import type { UserType } from "@/types/global";
import { toast } from "sonner";
import { errorMessage } from "@/utils/errorMessage";

const useDeleteCoverPicture = ({onSuccess}: {onSuccess: () => void}) => {
  const queryClient = useQueryClient();

  const {mutate, isPending} = useMutation({
    mutationFn: async () => {
      const {data} = await axiosInstance<{data: UserType}>({
        method: "DELETE",
        url: "/users/cover-picture"
      });
  
      return data.data;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({queryKey: ["user", data.clerkId]});
      onSuccess();
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    }
  });

  return {
    deleteCoverMutation: mutate,
    isPendingDeleteCover: isPending
  };
}

export default useDeleteCoverPicture;