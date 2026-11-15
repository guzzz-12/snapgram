import { describe, it, expect, beforeEach } from "vitest";
import { QueryClient, type InfiniteData } from "@tanstack/react-query";
import {
  updateMessagesCache,
  updateUnreadMessagesCounterCache,
  addNewChatToChatsListCache,
  updateChatLastMessageCache,
  updateGroupChatCache,
  addNewGroupToChatsListCache,
  deleteGroupFromChatsListCache,
  restoreDeletedChatCache,
  updateMsgDataCache
} from "@/utils/updateMsgsDataCache";
import {
  buildMockChat,
  buildMockMessage,
  buildMockNewMessageEvent
} from "../mocks/chats/factories";
import { buildMockUser } from "../mocks/users/factories";
import type { ChatType, MessageType } from "@/types/global";

type MessagesPage = {
  data: {
    messages: MessageType[];
    chat: ChatType;
    isNewChat: boolean;
  };
  hasMore: boolean;
  nextPage: number | null;
};

type ChatsListPage = {
  data: ChatType[];
  hasMore: boolean;
  nextPage: number | null;
};

/**
 * Suite unitaria para las utilidades de sincronización de caché en tiempo real (`src/utils/updateMsgsDataCache.tsx`).
 *
 * Propósito:
 *   Garantizar que los eventos entrantes de Socket.IO actualicen de forma consistente e inmutable
 *   las cachés de TanStack Query (`["messages", chatId]`, `["chats", "all"]` y `["chat", groupId]`)
 *   sin requerir refetches innecesarios al servidor ni romper la igualdad referencial de React.
 */
describe("updateMsgsDataCache", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
  });

  it("inserta el nuevo mensaje al inicio de la primera página en ['messages', chatId] preservando metadatos de paginación y páginas posteriores", () => {
    const chat = buildMockChat();
    const existingMsg = buildMockMessage({ chat: chat._id, text: "Mensaje previo" });
    const olderMsg = buildMockMessage({ chat: chat._id, text: "Mensaje antiguo" });

    const originalPage0Messages = Object.freeze([existingMsg]) as unknown as MessageType[];
    const page0: MessagesPage = {
      data: {
        messages: originalPage0Messages,
        chat,
        isNewChat: true
      },
      hasMore: true,
      nextPage: 2
    };
    const page1: MessagesPage = {
      data: {
        messages: [olderMsg],
        chat,
        isNewChat: true
      },
      hasMore: false,
      nextPage: null
    };
    const initialPageParams = [1, 2];

    queryClient.setQueryData<InfiniteData<MessagesPage>>(["messages", chat._id], {
      pages: [page0, page1],
      pageParams: initialPageParams
    });

    const incomingMsg = buildMockMessage({ chat: chat._id, text: "Nuevo mensaje" });
    const updatedChat = { ...chat, lastMessage: incomingMsg };
    const newMessageEvent = buildMockNewMessageEvent({
      message: incomingMsg,
      chat: updatedChat,
      isNewChat: false
    });

    updateMessagesCache({
      queryClient,
      chatId: chat._id,
      newMessage: newMessageEvent
    });

    const cached = queryClient.getQueryData<InfiniteData<MessagesPage>>(["messages", chat._id])!;

    expect(cached).toBeDefined();
    expect(cached.pages).toHaveLength(2);
    expect(cached.pageParams).toBe(initialPageParams);

    // Verifica datos actualizados e inmutabilidad en la primera página
    expect(cached.pages[0]).not.toBe(page0);
    expect(cached.pages[0].data).not.toBe(page0.data);
    expect(cached.pages[0].data.messages).not.toBe(originalPage0Messages);
    expect(cached.pages[0].data.messages).toEqual([incomingMsg, existingMsg]);
    expect(cached.pages[0].data.chat).toEqual(updatedChat);
    expect(cached.pages[0].data.isNewChat).toBe(false);

    // Verifica que no se hayan perdido hasMore ni nextPage en la página 0
    expect(cached.pages[0].hasMore).toBe(true);
    expect(cached.pages[0].nextPage).toBe(2);

    // La página 2 no debe ser modificada ni recreada
    expect(cached.pages[1]).toBe(page1);
  });

  it("agrega un nuevo chat en ['chats', 'all'] únicamente cuando isNewChat es true y el usuario actual es el receptor, preservando paginación", () => {
    const currentUser = buildMockUser({ _id: "current_user_id" });
    const otherUser = buildMockUser({ _id: "other_user_id" });

    const existingChat = buildMockChat({ participants: [currentUser, buildMockUser()] });
    const olderPageChat = buildMockChat({ participants: [currentUser, buildMockUser()] });

    const originalPage0Data = Object.freeze([existingChat]) as unknown as ChatType[];
    const page0: ChatsListPage = { data: originalPage0Data, hasMore: true, nextPage: 2 };
    const page1: ChatsListPage = { data: [olderPageChat], hasMore: false, nextPage: null };
    const initialCache: InfiniteData<ChatsListPage> = {
      pages: [page0, page1],
      pageParams: [1, 2]
    };

    queryClient.setQueryData<InfiniteData<ChatsListPage>>(["chats", "all"], initialCache);

    // Caso 1: Mismo usuario como remitente -> NO debe modificar la referencia en caché
    const ownChat = buildMockChat({ participants: [currentUser, otherUser] });
    const ownNewChatEvent = buildMockNewMessageEvent({
      chat: ownChat,
      message: buildMockMessage({ chat: ownChat._id, sender: currentUser }),
      isNewChat: true
    });

    addNewChatToChatsListCache({
      queryClient,
      newMessage: ownNewChatEvent,
      currentUserId: currentUser._id
    });

    expect(queryClient.getQueryData<InfiniteData<ChatsListPage>>(["chats", "all"])).toBe(
      initialCache
    );

    // Caso 2: isNewChat es false aunque sea receptor -> NO debe modificar la referencia en caché
    const existingChatEvent = buildMockNewMessageEvent({
      chat: ownChat,
      message: buildMockMessage({ chat: ownChat._id, sender: otherUser }),
      isNewChat: false
    });

    addNewChatToChatsListCache({
      queryClient,
      newMessage: existingChatEvent,
      currentUserId: currentUser._id
    });

    expect(queryClient.getQueryData<InfiniteData<ChatsListPage>>(["chats", "all"])).toBe(
      initialCache
    );

    // Caso 3: isNewChat es true y usuario actual es receptor -> SÍ debe insertarse al inicio de page 0
    const incomingNewChat = buildMockChat({ participants: [otherUser, currentUser] });
    const incomingNewChatEvent = buildMockNewMessageEvent({
      chat: incomingNewChat,
      message: buildMockMessage({ chat: incomingNewChat._id, sender: otherUser }),
      isNewChat: true
    });

    addNewChatToChatsListCache({
      queryClient,
      newMessage: incomingNewChatEvent,
      currentUserId: currentUser._id
    });

    const updatedCache = queryClient.getQueryData<InfiniteData<ChatsListPage>>(["chats", "all"])!;
    expect(updatedCache.pages[0].data).toEqual([incomingNewChatEvent.chat, existingChat]);
    expect(updatedCache.pages[0].hasMore).toBe(true);
    expect(updatedCache.pages[0].nextPage).toBe(2);
    expect(updatedCache.pages[1]).toBe(page1);
    expect(updatedCache.pageParams).toBe(initialCache.pageParams);

    // Caso 4: Soporta page.data undefined/vacío sin lanzar excepción (fallback page.data || [])
    queryClient.setQueryData<InfiniteData<ChatsListPage>>(["chats", "all"], {
      pages: [{ data: undefined as unknown as ChatType[], hasMore: false, nextPage: null }],
      pageParams: [1]
    });

    addNewChatToChatsListCache({
      queryClient,
      newMessage: incomingNewChatEvent,
      currentUserId: currentUser._id
    });

    expect(
      queryClient.getQueryData<InfiniteData<ChatsListPage>>(["chats", "all"])!.pages[0].data
    ).toEqual([incomingNewChatEvent.chat]);
  });

  it("actualiza de forma inmutable el último mensaje y el contador de no leídos en la página correspondiente de ['chats', 'all']", () => {
    const currentUser = buildMockUser({ _id: "user_me" });
    const peerUser = buildMockUser({ _id: "user_peer" });

    const chatPage0 = buildMockChat();
    const targetChat = buildMockChat({
      participants: [currentUser, peerUser],
      unseenMessages: [{ _id: "unseen_1", user: currentUser._id, count: 1 }]
    });
    const anotherChatPage1 = buildMockChat();

    const originalPage0: ChatsListPage = { data: [chatPage0], hasMore: true, nextPage: 2 };
    const originalPage1Data = Object.freeze([
      targetChat,
      anotherChatPage1
    ]) as unknown as ChatType[];
    const originalPage1: ChatsListPage = {
      data: originalPage1Data,
      hasMore: true,
      nextPage: 3
    };

    queryClient.setQueryData<InfiniteData<ChatsListPage>>(["chats", "all"], {
      pages: [originalPage0, originalPage1],
      pageParams: [1, 2]
    });

    // 1. Actualizar último mensaje (targetChat está en la página 1)
    const latestMsg = buildMockMessage({
      chat: targetChat._id,
      sender: peerUser,
      text: "Último mensaje"
    });
    const chatWithLastMsg: ChatType = {
      ...targetChat,
      lastMessage: latestMsg
    };

    updateChatLastMessageCache({
      queryClient,
      currentUserId: currentUser._id,
      newMessage: buildMockNewMessageEvent({
        chat: chatWithLastMsg,
        message: latestMsg
      })
    });

    const afterLastMsgCache = queryClient.getQueryData<InfiniteData<ChatsListPage>>([
      "chats",
      "all"
    ])!;
    expect(afterLastMsgCache.pages[0]).toBe(originalPage0);
    expect(afterLastMsgCache.pages[1]).not.toBe(originalPage1);
    expect(afterLastMsgCache.pages[1].data).not.toBe(originalPage1Data);
    expect(afterLastMsgCache.pages[1].data[0]).toEqual(chatWithLastMsg);
    expect(afterLastMsgCache.pages[1].data[1]).toBe(anotherChatPage1);
    expect(afterLastMsgCache.pages[1].hasMore).toBe(true);
    expect(afterLastMsgCache.pages[1].nextPage).toBe(3);

    // 2. Actualizar contador de mensajes no leídos en el mismo chat
    const chatWithIncrementedUnread: ChatType = {
      ...chatWithLastMsg,
      unseenMessages: [{ _id: "unseen_1", user: currentUser._id, count: 4 }]
    };

    updateUnreadMessagesCounterCache({
      queryClient,
      chat: chatWithIncrementedUnread
    });

    const afterUnreadCache = queryClient.getQueryData<InfiniteData<ChatsListPage>>([
      "chats",
      "all"
    ])!;
    expect(afterUnreadCache.pages[0]).toBe(originalPage0);
    expect(afterUnreadCache.pages[1].data[0].unseenMessages[0].count).toBe(4);
    expect(afterUnreadCache.pages[1].data).not.toBe(afterLastMsgCache.pages[1].data);
    expect(afterUnreadCache.pages[1].hasMore).toBe(true);
    expect(afterUnreadCache.pages[1].nextPage).toBe(3);
  });

  it("gestiona el ciclo de vida de grupos (agregar, actualizar, eliminar), restauración de chats y reemplazo inmutable de mensajes", () => {
    const existingPrivateChat = buildMockChat({ type: "private" });
    const existingGroup = buildMockChat({ type: "group", groupName: "Grupo Inicial" });
    const secondPageChat = buildMockChat({ type: "private" });

    const initialPage0Data = Object.freeze([
      existingPrivateChat,
      existingGroup
    ]) as unknown as ChatType[];
    const initialPage0: ChatsListPage = {
      data: initialPage0Data,
      hasMore: true,
      nextPage: 2
    };
    const initialPage1: ChatsListPage = {
      data: [secondPageChat],
      hasMore: false,
      nextPage: null
    };

    queryClient.setQueryData<InfiniteData<ChatsListPage>>(["chats", "all"], {
      pages: [initialPage0, initialPage1],
      pageParams: [1, 2]
    });
    queryClient.setQueryData<ChatType>(["chat", existingGroup._id], existingGroup);

    // 1. Agregar nuevo grupo al inicio preservando las páginas anteriores
    const newGroup = buildMockChat({ type: "group", groupName: "Nuevo Grupo" });
    addNewGroupToChatsListCache({ queryClient, newGroup });

    let chatsCache = queryClient.getQueryData<InfiniteData<ChatsListPage>>(["chats", "all"])!;
    expect(chatsCache.pages).toHaveLength(3);
    expect(chatsCache.pages[0]).toEqual({
      data: [newGroup],
      hasMore: false,
      nextPage: null
    });
    // Al hacer unshift de una página, replaceEqualDeep de TanStack Query compara recursivamente
    // el nuevo índice 1 contra el antiguo índice 1 y clona los contenedores que cambiaron de posición
    expect(chatsCache.pages[1]).toStrictEqual(initialPage0);
    expect(chatsCache.pages[2]).toBe(initialPage1);

    // 2. Actualizar grupo existente (tanto en ['chat', id] como en ['chats', 'all']) de forma inmutable
    const page1BeforeGroupUpdate = chatsCache.pages[1];
    const page2BeforeGroupUpdate = chatsCache.pages[2];
    const updatedGroup: ChatType = {
      ...existingGroup,
      groupName: "Grupo Renombrado",
      groupDescription: "Descripción actualizada"
    };
    updateGroupChatCache({ queryClient, updatedGroup });

    expect(queryClient.getQueryData<ChatType>(["chat", existingGroup._id])).toEqual(updatedGroup);
    chatsCache = queryClient.getQueryData<InfiniteData<ChatsListPage>>(["chats", "all"])!;
    expect(chatsCache.pages[0].data).toEqual([newGroup]);
    expect(chatsCache.pages[1]).not.toBe(page1BeforeGroupUpdate);
    expect(chatsCache.pages[1].data).not.toBe(page1BeforeGroupUpdate.data);
    expect(chatsCache.pages[1].data).toEqual([existingPrivateChat, updatedGroup]);
    expect(chatsCache.pages[1].hasMore).toBe(true);
    expect(chatsCache.pages[1].nextPage).toBe(2);
    expect(chatsCache.pages[2]).toBe(page2BeforeGroupUpdate);

    // 3. Eliminar grupo de la lista de chats preservando metadatos de la página y demás páginas
    const page1BeforeDelete = chatsCache.pages[1];
    const page2BeforeDelete = chatsCache.pages[2];
    deleteGroupFromChatsListCache({ queryClient, deletedGroupId: existingGroup._id });

    chatsCache = queryClient.getQueryData<InfiniteData<ChatsListPage>>(["chats", "all"])!;
    expect(chatsCache.pages).toHaveLength(3);
    expect(chatsCache.pages[1]).not.toBe(page1BeforeDelete);
    expect(chatsCache.pages[1].data).toEqual([existingPrivateChat]);
    expect(chatsCache.pages[1].hasMore).toBe(true);
    expect(chatsCache.pages[1].nextPage).toBe(2);
    expect(chatsCache.pages[2]).toBe(page2BeforeDelete);

    // 4. Restaurar chat eliminado preservando todas las páginas previas
    const pagesBeforeRestore = [...chatsCache.pages];
    const restoredChat = buildMockChat({ type: "private" });
    restoreDeletedChatCache({ queryClient, restoredChat });

    chatsCache = queryClient.getQueryData<InfiniteData<ChatsListPage>>(["chats", "all"])!;
    expect(chatsCache.pages).toHaveLength(4);
    expect(chatsCache.pages[0]).toEqual({
      data: [restoredChat],
      hasMore: false,
      nextPage: null
    });
    expect(chatsCache.pages[1]).toStrictEqual(pagesBeforeRestore[0]);
    expect(chatsCache.pages[2]).toStrictEqual(pagesBeforeRestore[1]);
    expect(chatsCache.pages[3]).toBe(pagesBeforeRestore[2]);

    // 5. Actualizar un mensaje en ['messages', chatId] de forma estrictamente inmutable
    const msgPage0 = buildMockMessage({ chat: existingPrivateChat._id, text: "Msg 1" });
    const targetMsg = buildMockMessage({ chat: existingPrivateChat._id, text: "Texto original" });
    const msgPage1Other = buildMockMessage({ chat: existingPrivateChat._id, text: "Msg 3" });

    const originalMsgPage0: MessagesPage = {
      data: { messages: [msgPage0], chat: existingPrivateChat, isNewChat: false },
      hasMore: true,
      nextPage: 2
    };
    const originalPage1Messages = Object.freeze([
      targetMsg,
      msgPage1Other
    ]) as unknown as MessageType[];
    const originalMsgPage1Data = Object.freeze({
      messages: originalPage1Messages,
      chat: existingPrivateChat,
      isNewChat: false
    });
    const originalMsgPage1: MessagesPage = {
      data: originalMsgPage1Data,
      hasMore: true,
      nextPage: 3
    };

    queryClient.setQueryData<InfiniteData<MessagesPage>>(["messages", existingPrivateChat._id], {
      pages: [originalMsgPage0, originalMsgPage1],
      pageParams: [1, 2]
    });

    const editedOrDeletedMsg: MessageType = {
      ...targetMsg,
      text: "Texto editado",
      deletedForAll: true
    };

    updateMsgDataCache({ queryClient, messageData: editedOrDeletedMsg });

    const messagesCache = queryClient.getQueryData<InfiniteData<MessagesPage>>([
      "messages",
      existingPrivateChat._id
    ])!;
    // Página 0 intacta por referencia
    expect(messagesCache.pages[0]).toBe(originalMsgPage0);
    // Página 1 clonada inmutablemente en todos sus niveles
    expect(messagesCache.pages[1]).not.toBe(originalMsgPage1);
    expect(messagesCache.pages[1].data).not.toBe(originalMsgPage1Data);
    expect(messagesCache.pages[1].data.messages).not.toBe(originalPage1Messages);
    expect(messagesCache.pages[1].data.messages).toEqual([editedOrDeletedMsg, msgPage1Other]);
    expect(messagesCache.pages[1].data.chat).toBe(existingPrivateChat);
    expect(messagesCache.pages[1].data.isNewChat).toBe(false);
    expect(messagesCache.pages[1].hasMore).toBe(true);
    expect(messagesCache.pages[1].nextPage).toBe(3);
  });

  it("no altera las páginas ni lanza errores cuando el ID buscado no existe dentro de una caché poblada", () => {
    const existingChat = buildMockChat({ type: "group" });
    const existingMsg = buildMockMessage({ chat: existingChat._id, text: "Mensaje en caché" });

    const populatedChatsCache: InfiniteData<ChatsListPage> = {
      pages: [{ data: [existingChat], hasMore: true, nextPage: 2 }],
      pageParams: [1]
    };
    const populatedMessagesCache: InfiniteData<MessagesPage> = {
      pages: [
        {
          data: { messages: [existingMsg], chat: existingChat, isNewChat: false },
          hasMore: true,
          nextPage: 2
        }
      ],
      pageParams: [1]
    };

    queryClient.setQueryData<InfiniteData<ChatsListPage>>(["chats", "all"], populatedChatsCache);
    queryClient.setQueryData<InfiniteData<MessagesPage>>(
      ["messages", existingChat._id],
      populatedMessagesCache
    );

    const nonExistentChat = buildMockChat({ _id: "non_existent_chat_id", type: "group" });
    const nonExistentMsg = buildMockMessage({
      _id: "non_existent_msg_id",
      chat: existingChat._id,
      text: "No existe en ninguna página"
    });

    // Ninguna de estas llamadas debe mutar ni recrear la caché si el elemento no está en ninguna página
    updateUnreadMessagesCounterCache({ queryClient, chat: nonExistentChat });
    updateChatLastMessageCache({
      queryClient,
      currentUserId: "any_user",
      newMessage: buildMockNewMessageEvent({ chat: nonExistentChat })
    });
    updateGroupChatCache({ queryClient, updatedGroup: nonExistentChat });
    deleteGroupFromChatsListCache({ queryClient, deletedGroupId: "non_existent_group_id" });
    updateMsgDataCache({ queryClient, messageData: nonExistentMsg });

    expect(queryClient.getQueryData<InfiniteData<ChatsListPage>>(["chats", "all"])).toBe(
      populatedChatsCache
    );
    expect(
      queryClient.getQueryData<InfiniteData<MessagesPage>>(["messages", existingChat._id])
    ).toBe(populatedMessagesCache);
    expect(queryClient.getQueryData(["chat", nonExistentChat._id])).toBeUndefined();
  });

  it("funciona como no-op seguro sin lanzar errores cuando las queries aún no existen en la caché", () => {
    const currentUser = buildMockUser({ _id: "user_1" });
    const otherUser = buildMockUser({ _id: "user_2" });
    const chat = buildMockChat({ participants: [currentUser, otherUser], type: "group" });
    const message = buildMockMessage({ chat: chat._id, sender: otherUser });
    const newMessageEvent = buildMockNewMessageEvent({
      chat,
      message,
      isNewChat: true
    });

    expect(() => {
      updateMessagesCache({ queryClient, chatId: chat._id, newMessage: newMessageEvent });
      updateUnreadMessagesCounterCache({ queryClient, chat });
      addNewChatToChatsListCache({
        queryClient,
        newMessage: newMessageEvent,
        currentUserId: currentUser._id
      });
      updateChatLastMessageCache({
        queryClient,
        newMessage: newMessageEvent,
        currentUserId: currentUser._id
      });
      updateGroupChatCache({ queryClient, updatedGroup: chat });
      addNewGroupToChatsListCache({ queryClient, newGroup: chat });
      deleteGroupFromChatsListCache({ queryClient, deletedGroupId: chat._id });
      restoreDeletedChatCache({ queryClient, restoredChat: chat });
      updateMsgDataCache({ queryClient, messageData: message });
    }).not.toThrow();

    expect(queryClient.getQueryData(["messages", chat._id])).toBeUndefined();
    expect(queryClient.getQueryData(["chats", "all"])).toBeUndefined();
    expect(queryClient.getQueryData(["chat", chat._id])).toBeUndefined();
  });
});