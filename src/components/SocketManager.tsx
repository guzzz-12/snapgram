import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import NotificationToast from "./NotificationToast";
import NewMessageToast from "./NewMessageToast";
import { useSocketStore } from "@/hooks/useSocket";
import { useUnseenNotifications } from "@/hooks/useUnseenNotifications";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUnreadChats } from "@/hooks/useUnreadChats";
import { useUsersTyping } from "@/hooks/useUsersTyping";
import { errorMessage } from "@/utils/errorMessage";
import { addNewChatToChatsListCache, addNewGroupToChatsListCache, deleteGroupFromChatsListCache, updateChatLastMessageCache, updateDeletedMessageCache, updateGroupChatCache, updateMessagesCache, updateUnreadMessagesCounterCache } from "@/utils/updateMsgsDataCache";
import { socket } from "@/utils/socket";

const SocketManager = () => {
  const {pathname} = useLocation();
  const params = useParams();
  const navigate = useNavigate();

  const [token, setToken] = useState<string | null>(null);

  const { getToken } = useAuth();

  const {user: userDocument} = useCurrentUser();

  const queryClient = useQueryClient();

  const { increaseNotificationsCount } = useUnseenNotifications();

  const { unreadChats, addToUnreadChats } = useUnreadChats();

  const { addToUsersTyping, removeFromUsersTyping } = useUsersTyping();

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

    // Escuchar el evento de mensaje eliminado
    socket.on("deletedMessage", (data) => {
      updateDeletedMessageCache({
        deletedMessage: data,
        queryClient
      });
    });

    // Escuchar evento de escribiendo
    socket.on("typing", (data) => {
      addToUsersTyping(data);
    });

    // Escuchar evento de dejar de escribir
    socket.on("stoppedTyping", (data) => {
      removeFromUsersTyping(data.userId);
    });

    // Escuchar evento de grupo creado
    // y actualizar la lista de chats
    socket.on("groupCreated", (data) => {
      addNewGroupToChatsListCache({
        queryClient,
        newGroup: data
      })
    });

    // Escuchar evento de grupo actualizado
    socket.on("groupUpdated", (data) => {
      updateGroupChatCache({
        queryClient,
        updatedGroup: data
      })
    });

    // Escuchar evento de grupo eliminado
    // y eliminar el item del grupo de la lista de chats
    socket.on("groupDeleted", (groupId) => {
      deleteGroupFromChatsListCache({
        queryClient,
        deletedGroupId: groupId
      });

      // Salir de la página del grupo eliminado si está en ella
      if (pathname === `/messages/${groupId}`) {
        navigate("/messages?type=all", {replace: true});
      }
    });

    // Escuchar evento de usuario removido del grupo
    socket.on("userLeftGroup", (data) => {
      updateGroupChatCache({
        queryClient,
        updatedGroup: data
      })
    });

    // Escuchar evento de usuario agregado al grupo
    // y actualizar la lista de chats del nuevo miembro
    socket.on("userJoinedGroup", (data) => {
      addNewGroupToChatsListCache({
        queryClient,
        newGroup: data
      })
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("setOnlineUsers");
      socket.off("newNotification");
      socket.off("newMessage");
      socket.off("deletedMessage");
      socket.off("typing");
      socket.off("stoppedTyping");
      socket.off("groupCreated");
      socket.off("groupUpdated");
      socket.off("groupDeleted");
      socket.off("userLeftGroup");
      socket.off("userJoinedGroup");
    }
  }, [socket, token, userDocument, queryClient, navigate, pathname]);


  // Escuchar el evento de nuevo mensaje (también se escucha en useNewMessage)
  useEffect(() => {
    if (!userDocument) return;

    socket.on("newMessage", (data) => {
      const senderId = data.message.sender._id;
      const currentChatId = params.chatId || "";

      // Actualizar la caché de los mensajes para actualizar la bandeja de entrada del chat
      if (data.chat._id === currentChatId) {
        updateMessagesCache({
          queryClient,
          chatId: currentChatId,
          newMessage: data
        });
      }

      // Agregar el nuevo chat a la lista de chats del usuario recipiente
      // al recibir el primer mensaje de un chat que aun no existe en su lista
      addNewChatToChatsListCache({
        queryClient,
        newMessage: data,
        currentUserId: userDocument._id
      });

      updateChatLastMessageCache({
        queryClient,
        newMessage: data,
        currentUserId: userDocument._id
      });

      // Actualizar el contador de mensajes no leidos al recipiente
      if (userDocument._id !== senderId) {
        updateUnreadMessagesCounterCache({
          chat: data.chat,
          queryClient
        });
  
        addToUnreadChats(data.chat._id);
      }

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

    return () => {
      socket.off("newMessage");
    }
  }, [socket, userDocument, pathname, params, unreadChats]);


  return null;
}

export default SocketManager