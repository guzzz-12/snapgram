import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { fetchNotifications } from "@/repositories/notificationsRepository";
import { useUnseenNotifications } from "@/hooks/useUnseenNotifications";
import { axiosInstance } from "@/utils/axiosInstance";

type GetNotificationsProps = {
  activeTab: "all" | "unread";
}

/**
 * Servicios de las notificaciones.
 * Debe ser invocado en el top level del componente.
 */
export const useNotificationsService = () => {
  const { getToken } = useAuth();

  const queryClient = useQueryClient();

  const {setUnseenNotifications} = useUnseenNotifications();

  return {
    /** Consultar y paginar las notificaciones */
    getNotifications: ({activeTab}: GetNotificationsProps) => {
      const notificationsData = useInfiniteQuery({
        queryKey: ["notifications", activeTab],
        queryFn: async ({pageParam}) => fetchNotifications({page: pageParam, activeTab, getToken}),
        initialPageParam: 1,
        getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
        refetchOnWindowFocus: false
      });

      const {data, error, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} = notificationsData;

      const notifications = data?.pages.flatMap(page => page.data) || [];

      return {
        notifications,
        error,
        isLoading,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage
      }
    },

    /** Marcar las notificaciones como leidas */
    markNotificationsAsRead: () => {
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
  }
}