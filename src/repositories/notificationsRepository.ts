import { axiosInstance } from "@/utils/axiosInstance";
import type { NotificationType } from "@/types/global";

type FetchNotificationsProps = {
  page: number;
  activeTab: "all" | "unread";
  getToken: () => Promise<string | null>;
}

/** Función para consultar las notificaciones */
export const fetchNotifications = async ({page, activeTab, getToken}: FetchNotificationsProps) => {
  const token = await getToken();

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
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });

  return data;
}