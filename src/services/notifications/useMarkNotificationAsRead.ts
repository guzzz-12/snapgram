import { useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "@/utils/axiosInstance";

/** Marcar notificacion como leída */
const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();

  const {mutate: markAsReadMutation} = useMutation({
    mutationFn: async (notificationId: string) => {
      return axiosInstance({
        method: "PUT",
        url: `/notifications/mark-as-read/${notificationId}`
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ["notifications"]});
    }
  });

  return {
    markAsReadMutation
  };
};

export default useMarkNotificationAsRead;