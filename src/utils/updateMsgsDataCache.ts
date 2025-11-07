import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { ChatType, MessageType } from "@/types/global";
import type { NewMessageEventData } from "@/types/socketTypes";

interface UpdateMsgCacheProps {
  queryClient: QueryClient;
  chatId: string;
  newMessage: NewMessageEventData;
}

interface UpdateDeletedMsgCacheProps {
  queryClient: QueryClient;
  deletedMessage: MessageType;
}

interface UpdateChatsListCacheProps {
  queryClient: QueryClient;
  newMessage: NewMessageEventData;
  currentUserId: string;
}

/**
 * Actualizar la caché de los mensajes al recibir un nuevo mensaje
 * para actualizar la bandeja de entrada del chat en tiempo real
 */
export const updateMessagesCache = (props: UpdateMsgCacheProps) => {
  const { queryClient, chatId, newMessage } = props;

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


/** Actualizar la caché de los mensajes al eliminar un mensaje */
export const updateDeletedMessageCache = (props: UpdateDeletedMsgCacheProps) => {
  const { queryClient, deletedMessage } = props;

  queryClient.setQueryData(["messages", deletedMessage.chat], (oldData: InfiniteData<{
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

    const newData = oldData.pages.map((page, index) => {
      if (index === 0) {
        const updatedMessages = [...page.data.messages];

        // Buscar el índice del mensaje eliminado
        const deletedMessageIndex = updatedMessages.findIndex((message) => message._id === deletedMessage._id);

        // Actualizar el mensaje eliminado
        if (deletedMessageIndex !== -1) {
          updatedMessages.splice(deletedMessageIndex, 1, deletedMessage);
        }

        return {
          ...page,
          data: {
            ...page.data,
            messages: updatedMessages
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


/**
 * Actualizar la caché de la lista de chats para agregar
 * el nuevo chat a la lista de chats del usuario recipiente
*/
export const updateChatsListCache = (props: UpdateChatsListCacheProps) => {
  const { queryClient, newMessage, currentUserId } = props;

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
}