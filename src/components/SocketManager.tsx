import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSocketStore } from "@/hooks/useSocket";
import { useUnseenNotifications } from "@/hooks/useUnseenNotifications";
import { socket } from "@/utils/socket";
import { errorMessage } from "@/utils/errorMessage";

const SocketManager = () => {
  const [token, setToken] = useState<string | null>(null);

  const { getToken, userId } = useAuth();

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
    if (!userId || !token) return;

    connectSocket(token);

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
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("setOnlineUsers");
      socket.off("newNotification");
    }
  }, [socket, userId, token]);

  return null;
}

export default SocketManager