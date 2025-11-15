import { useEffect } from "react";
import { useUnreadChats } from "./useUnreadChats";
import { useUnseenNotifications } from "./useUnseenNotifications";

/** Actualizar el contador de notificaciones en el title del navegador */
export const useTitleNotificationsCounter = () => {
  const {unreadChats} = useUnreadChats();
  const {unseenNotifications} = useUnseenNotifications();

  useEffect(() => {
    const currentTitle = document.title.replace(/\(\d+\)/, "").trim();
    const count = unseenNotifications + unreadChats.length;

    if (count > 0) {
      document.title = `(${count}) ${currentTitle}`;
    } else {
      document.title = currentTitle;
    }
    
  }, [unreadChats, unseenNotifications]);

  return null;
}