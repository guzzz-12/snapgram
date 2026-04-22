import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "@/utils/axiosInstance";

/** Hook para obtener el número de notificaciones no vistas */
const useGetUnseenNotificationsCount = ({ enabled }: { enabled: boolean }) => {
  const { data: unseenNotificationsCount, isLoading: loadingNotifications } = useQuery({
    queryKey: ["unseenNotificationsCount"],
    queryFn: async () => {

      const { data } = await axiosInstance<{ data: number }>({
        method: "GET",
        url: "/notifications/unseen"
      });

      return data.data;
    },
    enabled,
    retry: 2,
    refetchOnWindowFocus: false
  });

  return { unseenNotificationsCount, loadingNotifications };
}

export default useGetUnseenNotificationsCount;