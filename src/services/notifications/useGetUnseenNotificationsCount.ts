import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { axiosInstance } from "@/utils/axiosInstance";

/** Hook para obtener el número de notificaciones no vistas */
const useGetUnseenNotificationsCount = ({ enabled }: { enabled: boolean }) => {
  const { getToken } = useAuth();

  const { data: unseenNotificationsCount, isLoading: loadingNotifications } = useQuery({
    queryKey: ["unseenNotificationsCount"],
    queryFn: async () => {
      const token = await getToken();

      const { data } = await axiosInstance<{ data: number }>({
        method: "GET",
        url: "/notifications/unseen",
        headers: {
          Authorization: `Bearer ${token}`
        }
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