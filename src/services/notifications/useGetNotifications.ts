import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { fetchNotifications } from "@/repositories/notificationsRepository";

type GetNotificationsProps = {
  activeTab: "all" | "unread";
}

/** Hook para consultar y paginar las notificaciones */
const useGetNotifications = ({activeTab}: GetNotificationsProps) => {
  const { getToken } = useAuth();

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
}

export default useGetNotifications;