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

interface AddNewChatProps {
  queryClient: QueryClient;
  newMessage: NewMessageEventData;
  currentUserId: string;
}

interface AddNewGroupProps {
  queryClient: QueryClient;
  newGroup: ChatType;
}

interface UpdateUpdatedChatCacheProps {
  queryClient: QueryClient;
  updatedGroup: ChatType;
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


/** Actualizar el contador de mensajes no leídos del chat en la caché */
export const updateUnreadMessagesCounterCache = (props: {chat: ChatType, queryClient: QueryClient}) => {
  const { queryClient, chat } = props;

  queryClient.setQueryData(["chats", "all"], (oldData: InfiniteData<{
    data: ChatType[];
    hasMore: boolean;
    nextPage: number | null;
  }>) => {
    if (!oldData) {
      return oldData;
    }

    // Buscar la página que contiene el chat actualizado
    const chatPage = oldData.pages.find((page) => {
      return page.data.some((chatItem) => chatItem._id === chat._id)
    });

    if (!chatPage) {
      return oldData;
    }

    // Buscar el índice de la página que contiene el chat actualizado
    const updatedChatPageIndex = oldData.pages.findIndex((page) => {
      return page.data.some((chatItem) => chatItem._id === chat._id)
    });

    if (updatedChatPageIndex === -1) {
      return oldData;
    }

    // Crear una copia de la página que contiene el chat actualizado
    const updatedChatPage = {
      ...chatPage,
      data: [...chatPage.data]
    };

    // Buscar el índice del chat actualizado en la página
    const updatedChatIndex = updatedChatPage.data.findIndex((chatItem) => {
      return chatItem._id === chat._id;
    });

    if (updatedChatIndex === -1) {
      return oldData;
    }

    // Actualizar el chat en la data
    updatedChatPage.data.splice(updatedChatIndex, 1, chat);

    // Actualizar la página del chat en la caché
    const updatedPages = [...oldData.pages];
    updatedPages.splice(updatedChatPageIndex, 1, updatedChatPage);

    // Retornar la caché actualizada
    return {
      ...oldData,
      pages: updatedPages
    };
  });
}


/**
 * Actualizar la caché de la lista de chats para agregar
 * el nuevo chat a la lista de chats del usuario recipiente
 * al recibir el primer mensaje de un chat que aún no existe en su lista
*/
export const addNewChatToChatsListCache = (props: AddNewChatProps) => {
  const { queryClient, newMessage, currentUserId } = props;

  const isNewChat = newMessage.isNewChat;
  const isRecipient = newMessage.message.sender._id !== currentUserId;

  if (isNewChat && isRecipient) {
    queryClient.setQueryData(["chats", "all"], (oldData: InfiniteData<{
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

/**
 * Actualizar la caché de la lista de chats para
 * actualizar el preview del último mensaje recibido
 */
export const updateChatLastMessageCache = (props: AddNewChatProps) => {
  const { queryClient, newMessage } = props;

  queryClient.setQueryData(["chats", "all"], (oldData: InfiniteData<{
    data: ChatType[];
    hasMore: boolean;
    nextPage: number | null;
  }>) => {
    if (!oldData) {
      return oldData;
    }

    // Buscar la página que contiene el chat correspondiente al mensaje recibido
    const chatPage = oldData.pages.find((page, _index) => {
      return page.data.some((chat) => chat._id === newMessage.chat._id);
    });

    if (!chatPage) {
      return oldData;
    }

    // Buscar el índice de la página del chat en la caché
    const chatPageIndex = oldData.pages.findIndex((page) => {
      return page.data.some((chat) => chat._id === newMessage.chat._id)
    });

    // Crear una copia de la página del chat actualizado
    const updatedChatPage = {
      ...chatPage,
      data: [...chatPage.data]
    };

    // Buscar el índice del chat correspondiente al mensaje recibido
    const updatedChatIndex = updatedChatPage.data.findIndex((chat) => chat._id === newMessage.chat._id);

    if (updatedChatIndex === -1) {
      return oldData;
    }
    
    // Actualizar el chat correspondiente al mensaje recibido
    updatedChatPage.data.splice(updatedChatIndex, 1, newMessage.chat);

    // Actualizar la página del chat en la caché
    const updatedPages = [...oldData.pages];
    updatedPages.splice(chatPageIndex, 1, updatedChatPage);
    
    return {
      ...oldData,
      pages: updatedPages,
    };
  });
}

/**
 * Actualizar la caché de la lista de chats al actualizar un chat
 */
export const updateGroupChatCache = (props: UpdateUpdatedChatCacheProps) => {
  const { queryClient, updatedGroup } = props;

  // Actualizar la caché del chat (grupo) actualizado
  queryClient.setQueryData(["chat", updatedGroup._id], (oldData: ChatType) => {
    if (!oldData) {
      return oldData;
    }

    return updatedGroup;
  });

  // Actualizar la caché del item del grupo en la lista de chats
  queryClient.setQueryData(["chats", "all"], (oldData: InfiniteData<{
    data: ChatType[];
    hasMore: boolean;
    nextPage: number | null;
  }>) => {
    if (!oldData) {
      return oldData;
    }

    // Buscar la página que contiene el chat actualizado
    const chatPage = oldData.pages.find((page, _index) => {
      return page.data.some((chat) => chat._id === updatedGroup._id);
    });

    if (!chatPage) {
      return oldData;
    }

    // Buscar el índice de la página del chat actualiazado
    const chatPageIndex = oldData.pages.findIndex((page) => {
      return page.data.some((chat) => chat._id === updatedGroup._id)
    });

    // Crear una copia de la página del chat actualizado
    const updatedChatPage = {
      ...chatPage,
      data: [...chatPage.data]
    };

    // Buscar el índice del chat actualizado
    const updatedChatIndex = updatedChatPage.data.findIndex((chat) => chat._id === updatedGroup._id);

    if (updatedChatIndex === -1) {
      return oldData;
    }

    // Reemplazar el chat en la página por el chat actualizado
    updatedChatPage.data.splice(updatedChatIndex, 1, updatedGroup);

    // Actualizar la página del chat en la caché
    const updatedPages = [...oldData.pages];
    updatedPages.splice(chatPageIndex, 1, updatedChatPage);

    return {
      ...oldData,
      pages: updatedPages,
    };
  });
}

/**
 * Agregar el item del nuevo grupo a la caché
 * de la lista de chats del usuario recipiente
 */
export const addNewGroupToChatsListCache = (props: AddNewGroupProps) => {
  const { queryClient, newGroup } = props;

  queryClient.setQueryData(["chats", "all"], (oldData: InfiniteData<{
    data: ChatType[];
    hasMore: boolean;
    nextPage: number | null;
  }>) => {
    if (!oldData) {
      return oldData;
    }

    const updatedPages = [...oldData.pages];

    updatedPages.unshift({
      data: [newGroup],
      hasMore: false, 
      nextPage: null
    });

    return {
      ...oldData,
      pages: updatedPages
    };
  });
}