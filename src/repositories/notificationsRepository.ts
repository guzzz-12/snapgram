import { axiosInstance } from "@/utils/axiosInstance";
import type { NotificationType } from "@/types/global";

type FetchNotificationsProps = {
  page: number;
  activeTab: "all" | "unread";
}

/** Función para consultar las notificaciones */
export const fetchNotifications = async ({page, activeTab}: FetchNotificationsProps) => {
  const {data} = await axiosInstance<{
    data: NotificationType[];
    hasMore: boolean;
    nextPage: number | null;
  }>({
    method: "GET",
    url: "/notifications",
    params: {
      page,
      limit: 5,
      filter: activeTab
    },
    headers: {
      "Content-Type": "application/json"
    }
  });

  return data;
}