import { axiosInstance } from "@/utils/axiosInstance";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Marcar todas las notificaciones como leídas.
 * Las notificaciones no leídas se muestran con un punto en el extremo para indicarle al usuario que aún no ha clickeado la notificación.
 * El estado isRead de todas las notificaciones cambia a true al clickear la opción
 * "Marcar todas como leídas" en el menú de opciones de las notificaciones
 */
const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();

  const {mutate: markAllAsRead, isPending} = useMutation({
    mutationFn: async () => {
      return axiosInstance({
        method: "PUT",
        url: "/notifications/mark-all-as-read"
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ["notifications"]});
    }
  });

  return {
    mutate: markAllAsRead,
    isPending
  }
}

export default useMarkAllAsRead;