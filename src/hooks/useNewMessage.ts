import { useEffect } from "react";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { socket } from "@/utils/socket";
import type { ChatType, MessageType } from "@/types/global";

interface Props {
  chatId: string;
  currentUserId: string;
}

/** Escuchar el evento de nuevo mesaje y actualizar
 * la bandeja de entrada del chat en tiempo real
  */
export const useNewMessage = (props: Props) => {
  const { chatId, currentUserId } = props;

  const queryClient = useQueryClient();

  useEffect(() => {
    socket.on("newPrivateMessage", (newMessage) => {
      if (newMessage.chat._id === chatId) {
        // Actualizar la caché de los mensajes para actualizar la bandeja de entrada del chat
        queryClient.setQueryData(["messages", chatId], (oldData: InfiniteData<{
          data: {
            messages: MessageType[];
            chat: ChatType;
            isNewChat: boolean;
          };
          hasMore: boolean;
          nextPage: number | null;
        }>) => {
          if (!oldData) {
            return oldData;
          }

          // La data de useInfiniteQuery tiene la forma { pages: [...], pageParams: [...] }
          const newData = oldData.pages.map((page, index) => {
            if (index === 0) {
              const currentMessages = page.data.messages;

              return {
                ...page,
                data: {
                  messages: [newMessage.message, ...currentMessages],
                  chat: newMessage.chat,
                  isNewChat: newMessage.isNewChat
                }
              };
            }

            // Retornar las otras páginas sin cambios
            return page;
          });

          // Retornar la caché actualizada
          return {
            ...oldData,
            pages: newData,
          };
        });
      }

      // Actualizar la caché de la lista de chats para agregar
      // el nuevo chat a la lista de chats del usuario recipiente
      const isNewChat = newMessage.isNewChat;
      const isRecipient = newMessage.message.sender._id !== currentUserId;

      if (isNewChat && isRecipient) {
        queryClient.setQueryData(["chats"], (oldData: InfiniteData<{
          data: ChatType[];
          hasMore: boolean;
          nextPage: number | null;
        }>) => {
          if (!oldData) {
            return oldData;
          }

          const newData = oldData.pages.map((page, index) => {
            if (index === 0) {
              const currentChats = page.data || [];

              return {
                ...page,
                data: [newMessage.chat, ...currentChats]
              };
            }

            // Retornar las otras páginas sin cambios
            return page;
          });

          // Retornar la caché actualizada
          return {
            ...oldData,
            pages: newData,
          };
        });
      }
    });

    return () => {
      socket.off("newPrivateMessage");
    };
  }, [chatId, currentUserId]);

  return null
}