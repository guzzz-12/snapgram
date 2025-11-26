import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socket } from "@/utils/socket";
import { addNewChatToChatsListCache, updateMessagesCache } from "@/utils/updateMsgsDataCache";

interface Props {
  chatId: string;
  currentUserId: string;
}

/** Escuchar el evento de nuevo mesaje para actualizar en tiempo real la bandeja
 * de entrada y agregar el item a la lista de chats si es un chat nuevo
*/
export const useNewMessage = (props: Props) => {
  const { chatId, currentUserId } = props;

  const queryClient = useQueryClient();

  useEffect(() => {
    socket.on("newMessage", (newMessage) => {
      if (newMessage.chat._id === chatId) {
        // Actualizar la caché de los mensajes para actualizar la bandeja de entrada del chat
        updateMessagesCache({ queryClient, chatId, newMessage });
      }

      // Actualizar la caché de la lista de chats para agregar
      // el nuevo chat a la lista de chats del usuario recipiente
      addNewChatToChatsListCache({ queryClient, newMessage, currentUserId });
    });

    return () => {
      socket.off("newMessage");
    };
  }, [chatId, currentUserId]);

  return null
}