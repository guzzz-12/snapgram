import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import NotificationToast from "./NotificationToast";
import NewMessageToast from "./NewMessageToast";
import { useSocketStore } from "@/hooks/useSocket";
import { useUnseenNotifications } from "@/hooks/useUnseenNotifications";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { socket } from "@/utils/socket";
import { errorMessage } from "@/utils/errorMessage";
import { updateDeletedMessageCache } from "@/utils/updateMsgsDataCache";

const SocketManager = () => {
  const {pathname} = useLocation();

  const [token, setToken] = useState<string | null>(null);

  const { getToken } = useAuth();

  const {user: userDocument} = useCurrentUser();

  const queryClient = useQueryClient();

  const { increaseNotificationsCount } = useUnseenNotifications();

  // Consultar el token de autenticación
  useEffect(() => {
    const authToken = async () => {
      try {
        const token = await getToken();

        setToken(token);

      } catch (error: any) {
        toast.error(errorMessage(error));
      }
    }

    authToken();
  }, []);

  const {connectSocket, setOnlineUsers, setConnected} = useSocketStore();

  // Conectar el socket y escuchar los eventos
  useEffect(() => {
    if (!userDocument || !token) return;

    connectSocket({ token, userId: userDocument._id });

    socket.on("connect", () => {
      setConnected(true);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    // Escuchar el evento de actualización de usuarios conectados
    socket.on("setOnlineUsers", (onlineUsers) => {
      setOnlineUsers(onlineUsers);
    });

    // Escuchar evento de nueva notificación
    socket.on("newNotification", (notification) => {
      increaseNotificationsCount();

      queryClient.invalidateQueries({queryKey: ["notifications"]});

      if (notification.notificationType === "comment") {
        queryClient.invalidateQueries({queryKey: ["postComments", notification.originalPostId]});
      }

      if (notification.notificationType === "follow") {
        queryClient.invalidateQueries({queryKey: ["followers", notification.recipientId]})
      }

      toast.dismiss();

      toast(
        <NotificationToast notificationData={notification} />,
        {
          duration: 6000,
          position: "bottom-left",
          style: {
            width: "fit-content",
            padding: 0
          }
        }
      );
    });

    // Escuchar el evento de nuevo mensaje (también se escucha en useNewMessage)
    socket.on("newPrivateMessage", (data) => {
      const senderId = data.message.sender._id;

      // Mostrar toast al usuario que recibio el mensaje
      // si no está en la página del chat
      if (senderId !== userDocument._id && pathname !== `/messages/${data.chat._id}`) {
        toast(
          <NewMessageToast messageData={data.message} />,
          {
            duration: 6000,
            position: "bottom-left",
            style: {
              width: "fit-content",
              padding: 0
            }
          }
        )
      }
    });

    // Escuchar el evento de mensaje eliminado
    socket.on("deletedMessage", (data) => {
      updateDeletedMessageCache({
        deletedMessage: data,
        queryClient
      });
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("setOnlineUsers");
      socket.off("newNotification");
      socket.off("newPrivateMessage");
      socket.off("deletedMessage");
    }
  }, [socket, token, userDocument, pathname]);

  return null;
}

export default SocketManager