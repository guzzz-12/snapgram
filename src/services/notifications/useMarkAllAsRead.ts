import { axiosInstance } from "@/utils/axiosInstance";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/** Marcar todas las notificaciones como leídas */
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