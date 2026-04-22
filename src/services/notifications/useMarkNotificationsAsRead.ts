import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUnseenNotifications } from "@/hooks/useUnseenNotifications";
import { axiosInstance } from "@/utils/axiosInstance";

/** Hook para marcar las notificaciones como leídas */
const useMarkNotificationsAsRead = () => {
  const queryClient = useQueryClient();

  const { setUnseenNotifications } = useUnseenNotifications();

  const { mutate: markAllAsSeen } = useMutation({
    mutationFn: () => {
      return axiosInstance({
        method: "PUT",
        url: "/notifications/unseen"
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ["notifications"]});
      setUnseenNotifications(0);
    }
  });

  return markAllAsSeen;
}

export default useMarkNotificationsAsRead;