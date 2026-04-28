import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUnseenNotifications } from "@/hooks/useUnseenNotifications";
import { axiosInstance } from "@/utils/axiosInstance";

/**
 * Hook para marcar las notificaciones como vistas
 * Las notificaciones no vistas se muestran con un color de background diferente al resto por unos instantes mientras el servidor procesa la consulta.
 * El estado isSeen de todas las notificaciones cambia a true automáticamente al cargarlas.
 */
const useMarkNotificationsAsSeen = () => {
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

export default useMarkNotificationsAsSeen;