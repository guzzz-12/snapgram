import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";

const useDeleteNotification = ({notificationId}: {notificationId: string}) => {
  const queryClient = useQueryClient();

  const {mutate, isPending} = useMutation({
    mutationFn: async () => {
      return axiosInstance({
        method: "DELETE",
        url: `/notifications/${notificationId}`
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ["notifications"]});
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    }
  });

  return {
    mutate,
    isPending
  }
}

export default useDeleteNotification;