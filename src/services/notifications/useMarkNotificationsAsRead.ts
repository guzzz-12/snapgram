import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { useUnseenNotifications } from "@/hooks/useUnseenNotifications";
import { axiosInstance } from "@/utils/axiosInstance";

 /** Hook para marcar las notificaciones como leidas */
const useMarkNotificationsAsRead = () => {
  const {getToken} = useAuth();

  const queryClient = useQueryClient();

  const {setUnseenNotifications} = useUnseenNotifications();

  const {mutate: markAllAsSeen} = useMutation({
    mutationFn: async () => {
      const token = await getToken();

      return axiosInstance({
        method: "PUT",
        url: "/notifications/unseen",
        headers: {
          Authorization: `Bearer ${token}`
        }
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