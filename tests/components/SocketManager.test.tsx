import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { QueryClient, QueryClientProvider, type InfiniteData } from "@tanstack/react-query";
import SocketManager from "@/components/SocketManager";
import NotificationToast from "@/components/NotificationToast";
import NewMessageToast from "@/components/NewMessageToast";
import { AuthContext, type AuthContext as AuthContextType } from "@/providers/AuthProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useSocketStore } from "@/hooks/useSocket";
import { useUnseenNotifications } from "@/hooks/useUnseenNotifications";
import { useUnreadChats } from "@/hooks/useUnreadChats";
import { useUsersTyping } from "@/hooks/useUsersTyping";
import { useUsersRecordingAudio } from "@/hooks/useUsersRecordingAudio";
import { useCheckLocalCryptoKeys } from "@/hooks/useCheckLocalCryptoKeys";
import { socket } from "@/utils/socket";
import type { ChatType, MessageType } from "@/types/global";
import type { NotificationEventData } from "@/types/socketTypes";
import { buildMockUser } from "../mocks/users/factories";
import {
  buildMockChat,
  buildMockMessage,
  buildMockNewMessageEvent
} from "../mocks/chats/factories";
import type { SocketMock } from "../mocks/socket/socketMock";

const { toastMock } = vi.hoisted(() => {
  const fn = vi.fn() as ReturnType<typeof vi.fn> & {
    dismiss: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    success: ReturnType<typeof vi.fn>;
  };
  fn.dismiss = vi.fn();
  fn.error = vi.fn();
  fn.success = vi.fn();
  return { toastMock: fn };
});

vi.mock("sonner", () => ({ toast: toastMock }));

vi.mock("@/utils/socket", async () => {
  const { createSocketMock } = await import("../mocks/socket/socketMock");
  return { socket: createSocketMock() };
});

const socketMock = socket as unknown as SocketMock;

const emitRawSocketEvent = (event: string, ...args: unknown[]) => {
  (socketMock.emitServerEvent as (ev: string, ...a: unknown[]) => void)(event, ...args);
};

/**
 * Suite de integración para el gestor central de eventos en tiempo real
 * (`src/components/SocketManager.tsx`).
 *
 * Propósito:
 *   Validar la conexión autenticada por Socket.IO, la sincronización en vivo de notificaciones,
 *   mensajes entrantes según la ruta activa, eliminación de grupos con redirección condicional,
 *   estados efímeros (escritura/grabación de audio) y la limpieza completa de listeners al desmontar.
 *
 * Qué evalúa y alcance (SUT):
 *   - Conexión y presencia: solicita el token con `getToken()`, invoca `connectSocket`,
 *     sincroniza `connect`/`disconnect` y `setOnlineUsers` en `useSocketStore`.
 *   - `newNotification`: incrementa `useUnseenNotifications`, invalida `["notifications"]` y
 *     las cachés específicas por tipo (`["postComments", id]` para `"comment"`,
 *     `["followers", id]` para `"follow"`), y despliega `NotificationToast`.
 *   - `newMessage`: guarda por `hasLocalCryptoKeys`; dentro de `/messages/:chatId` actualiza
 *     `["messages", chatId]` sin lanzar `NewMessageToast`; fuera del chat lanza
 *     `NewMessageToast` e incrementa `useUnreadChats` solo para mensajes regulares de terceros
 *     (excluyendo mensajes propios y eventos de sistema de grupo).
 *   - `groupDeleted`: remueve el grupo de `["chats", "all"]` con `deleteGroupFromChatsListCache`
 *     y redirige a `"/messages?type=all"` únicamente si el usuario estaba en `/messages/:groupId`.
 *   - Eventos efímeros y limpieza: actualiza `useUsersTyping` (`typing`/`stoppedTyping`) y
 *     `useUsersRecordingAudio` (`recordingAudio`/`stoppedRecordingAudio`), y desregistra todos
 *     los listeners (`socket.off`) al desmontar.
 */
describe("SocketManager", () => {
  let queryClient: QueryClient;

  const currentUser = buildMockUser({
    _id: "usr_me_sock_1",
    clerkId: "clerk_me_sock_1",
    fullName: "Valeria Activa",
    username: "valeria_a"
  });

  const otherUser = buildMockUser({
    _id: "usr_other_sock_2",
    clerkId: "clerk_other_sock_2",
    fullName: "Diego Remoto",
    username: "diego_r"
  });

  const LocationDisplay = () => {
    const location = useLocation();
    return (
      <div data-testid="current-location">
        {location.pathname}
        {location.search}
      </div>
    );
  };

  type RenderOptions = {
    initialRoute?: string;
    user?: typeof currentUser | null;
    hasLocalCryptoKeys?: boolean;
    token?: string | null;
  };

  const renderSocketManager = ({
    initialRoute = "/",
    user = currentUser,
    hasLocalCryptoKeys = true,
    token = "jwt-socket-token"
  }: RenderOptions = {}) => {
    useCurrentUser.setState({ user, loadingUser: false });
    useCheckLocalCryptoKeys.setState({ hasLocalCryptoKeys });

    const authValue: AuthContextType = {
      userId: user?.clerkId ?? null,
      isLoaded: true,
      isSignedIn: !!user,
      signOut: vi.fn().mockResolvedValue(undefined) as unknown as AuthContextType["signOut"],
      getToken: vi.fn().mockResolvedValue(token) as unknown as AuthContextType["getToken"]
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <MemoryRouter initialEntries={[initialRoute]}>
            <Routes>
              <Route
                path="/messages/:chatId"
                element={
                  <>
                    <SocketManager />
                    <LocationDisplay />
                  </>
                }
              />
              <Route
                path="*"
                element={
                  <>
                    <SocketManager />
                    <LocationDisplay />
                  </>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    socketMock.reset();
    socketMock.connected = false;
    socketMock.auth = {};
    toastMock.mockClear();
    toastMock.dismiss.mockClear();
    toastMock.error.mockClear();
    toastMock.success.mockClear();

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    useSocketStore.setState({ isConnected: false, onlineUsers: [] });
    useUnseenNotifications.setState({ unseenNotifications: 0 });
    useUnreadChats.setState({ unreadChats: [] });
    useUsersTyping.setState({ usersTyping: [] });
    useUsersRecordingAudio.setState({ usersRecordingAudio: [] });
    useCheckLocalCryptoKeys.setState({ hasLocalCryptoKeys: false });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    queryClient.clear();
    socketMock.reset();
    useCurrentUser.setState({ user: null, loadingUser: false });
    useSocketStore.setState({ isConnected: false, onlineUsers: [] });
    useUnseenNotifications.setState({ unseenNotifications: 0 });
    useUnreadChats.setState({ unreadChats: [] });
    useUsersTyping.setState({ usersTyping: [] });
    useUsersRecordingAudio.setState({ usersRecordingAudio: [] });
    useCheckLocalCryptoKeys.setState({ hasLocalCryptoKeys: false });
  });

  it("conecta el socket autenticado cuando hay usuario y token, y sincroniza connect, disconnect y setOnlineUsers", async () => {
    // Sin usuario autenticado no conecta ni registra listeners
    const noUserRender = renderSocketManager({ user: null });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    expect(socketMock.connect).not.toHaveBeenCalled();
    expect(socketMock.getListenerCount("newNotification")).toBe(0);
    noUserRender.unmount();

    // Con usuario y token conecta y registra eventos de conexión/presencia
    renderSocketManager({ user: currentUser, token: "tok_abc" });

    await waitFor(() => {
      expect(socketMock.connect).toHaveBeenCalledTimes(1);
    });
    expect(socketMock.auth).toEqual({
      token: "Bearer tok_abc",
      userId: currentUser._id
    });

    act(() => {
      emitRawSocketEvent("connect");
    });
    expect(useSocketStore.getState().isConnected).toBe(true);

    act(() => {
      socketMock.emitServerEvent("setOnlineUsers", [
        { clerkUserId: "clerk_other_sock_2", socketId: "sock_99" }
      ]);
    });
    expect(useSocketStore.getState().onlineUsers).toEqual([
      { clerkUserId: "clerk_other_sock_2", socketId: "sock_99" }
    ]);

    act(() => {
      emitRawSocketEvent("disconnect");
    });
    expect(useSocketStore.getState().isConnected).toBe(false);
  });

  it("procesa newNotification incrementando unseenNotifications, invalidando cachés por tipo y desplegando NotificationToast", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    renderSocketManager();

    await waitFor(() => {
      expect(socketMock.getListenerCount("newNotification")).toBe(1);
    });

    const commentNotification: NotificationEventData = {
      _id: "notif_comment_1",
      notificationType: "comment",
      originalPostId: "post_orig_42",
      recipientId: currentUser._id,
      recipientUsername: currentUser.username,
      onItem: null,
      sender: {
        _id: otherUser._id,
        clerkId: otherUser.clerkId,
        fullName: otherUser.fullName,
        username: otherUser.username,
        profilePicture: otherUser.profilePicture
      }
    };

    act(() => {
      socketMock.emitServerEvent("newNotification", commentNotification);
    });

    expect(useUnseenNotifications.getState().unseenNotifications).toBe(1);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["notifications"] });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["postComments", "post_orig_42"]
    });
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: ["followers", currentUser._id]
    });
    expect(toastMock.dismiss).toHaveBeenCalledTimes(1);
    expect(toastMock).toHaveBeenCalledTimes(1);
    const firstToastElement = toastMock.mock.calls[0][0] as React.ReactElement<{
      notificationData: NotificationEventData;
    }>;
    expect(firstToastElement.type).toBe(NotificationToast);
    expect(firstToastElement.props.notificationData).toEqual(commentNotification);

    // Notificación de tipo "follow" invalida ["followers", recipientId]
    const followNotification: NotificationEventData = {
      ...commentNotification,
      _id: "notif_follow_2",
      notificationType: "follow",
      originalPostId: null
    };

    act(() => {
      socketMock.emitServerEvent("newNotification", followNotification);
    });

    expect(useUnseenNotifications.getState().unseenNotifications).toBe(2);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["followers", currentUser._id]
    });
    expect(toastMock).toHaveBeenCalledTimes(2);
  });

  it("actualiza la caché de mensajes en /messages/:chatId sin mostrar NewMessageToast y respeta la guarda hasLocalCryptoKeys", async () => {
    // 1. Sin claves criptográficas locales no escucha newMessage
    const noKeysRender = renderSocketManager({
      initialRoute: "/messages/chat_active_1",
      hasLocalCryptoKeys: false
    });
    await waitFor(() => {
      expect(socketMock.connect).toHaveBeenCalledTimes(1);
    });
    expect(socketMock.getListenerCount("newMessage")).toBe(0);
    noKeysRender.unmount();

    // 2. Con claves locales dentro del chat activo
    const activeChat = buildMockChat({
      _id: "chat_active_1",
      type: "private",
      participants: [currentUser, otherUser]
    });
    const existingMsg = buildMockMessage({
      _id: "msg_old_1",
      chat: activeChat._id,
      sender: currentUser,
      text: "enc-old"
    });

    queryClient.setQueryData(["messages", activeChat._id], {
      pages: [
        {
          data: { messages: [existingMsg], chat: activeChat, isNewChat: false },
          hasMore: false,
          nextPage: null
        }
      ],
      pageParams: [1]
    });
    queryClient.setQueryData(["chats", "all"], {
      pages: [{ data: [activeChat], hasMore: false, nextPage: null }],
      pageParams: [1]
    });

    renderSocketManager({
      initialRoute: `/messages/${activeChat._id}`,
      hasLocalCryptoKeys: true
    });

    await waitFor(() => {
      expect(socketMock.getListenerCount("newMessage")).toBe(1);
    });

    const incomingMsg = buildMockMessage({
      _id: "msg_incoming_2",
      chat: activeChat._id,
      sender: otherUser,
      type: "text",
      text: "enc-new"
    });

    act(() => {
      socketMock.emitServerEvent(
        "newMessage",
        buildMockNewMessageEvent({
          chat: activeChat,
          message: incomingMsg,
          isNewChat: false
        })
      );
    });

    const cachedMessages = queryClient.getQueryData<
      InfiniteData<{ data: { messages: MessageType[]; chat: ChatType } }>
    >(["messages", activeChat._id]);

    expect(cachedMessages?.pages[0].data.messages.map((m) => m._id)).toEqual([
      "msg_incoming_2",
      "msg_old_1"
    ]);
    expect(useUnreadChats.getState().unreadChats).toContain("chat_active_1");
    // Al estar en la ruta /messages/chat_active_1 NO debe mostrar NewMessageToast
    expect(toastMock).not.toHaveBeenCalled();
  });

  it("muestra NewMessageToast e incrementa unreadChats fuera del chat activo solo para mensajes regulares de terceros", async () => {
    const otherChat = buildMockChat({
      _id: "chat_remote_7",
      type: "private",
      participants: [currentUser, otherUser]
    });

    queryClient.setQueryData(["chats", "all"], {
      pages: [{ data: [otherChat], hasMore: false, nextPage: null }],
      pageParams: [1]
    });

    renderSocketManager({
      initialRoute: "/discover",
      hasLocalCryptoKeys: true
    });

    await waitFor(() => {
      expect(socketMock.getListenerCount("newMessage")).toBe(1);
    });

    // 1. Mensaje regular de otro usuario estando en /discover -> incrementa unreadChats y muestra toast
    const remoteMsg = buildMockMessage({
      _id: "msg_remote_1",
      chat: otherChat._id,
      sender: otherUser,
      type: "text",
      text: "enc-hello"
    });

    act(() => {
      socketMock.emitServerEvent(
        "newMessage",
        buildMockNewMessageEvent({ chat: otherChat, message: remoteMsg })
      );
    });

    expect(useUnreadChats.getState().unreadChats).toEqual(["chat_remote_7"]);
    expect(toastMock).toHaveBeenCalledTimes(1);
    const toastElement = toastMock.mock.calls[0][0] as React.ReactElement<{
      messageData: MessageType;
      currentUser: typeof currentUser;
    }>;
    expect(toastElement.type).toBe(NewMessageToast);
    expect(toastElement.props.messageData._id).toBe("msg_remote_1");
    expect(toastElement.props.currentUser._id).toBe(currentUser._id);

    toastMock.mockClear();
    act(() => {
      useUnreadChats.setState({ unreadChats: [] });
    });

    // 2. Mensaje propio -> no agrega a unreadChats ni muestra toast
    const ownMsg = buildMockMessage({
      _id: "msg_own_2",
      chat: otherChat._id,
      sender: currentUser,
      type: "text"
    });
    act(() => {
      socketMock.emitServerEvent(
        "newMessage",
        buildMockNewMessageEvent({ chat: otherChat, message: ownMsg })
      );
    });
    expect(useUnreadChats.getState().unreadChats).toEqual([]);
    expect(toastMock).not.toHaveBeenCalled();

    // 3. Mensaje de sistema de grupo (userAddedToGroup) -> no muestra toast
    const systemGroupMsg = buildMockMessage({
      _id: "msg_sys_3",
      chat: otherChat._id,
      sender: otherUser,
      type: "userAddedToGroup"
    });
    act(() => {
      socketMock.emitServerEvent(
        "newMessage",
        buildMockNewMessageEvent({ chat: otherChat, message: systemGroupMsg })
      );
    });
    expect(toastMock).not.toHaveBeenCalled();
  });

  it("elimina el grupo de ['chats', 'all'] ante groupDeleted y redirige a /messages?type=all solo si estaba en ese grupo", async () => {
    const groupToDelete = buildMockChat({
      _id: "grp_del_1",
      type: "group",
      groupName: "Grupo Temporal"
    });
    const groupToKeep = buildMockChat({
      _id: "grp_keep_2",
      type: "group",
      groupName: "Grupo Activo"
    });

    queryClient.setQueryData(["chats", "all"], {
      pages: [{ data: [groupToDelete, groupToKeep], hasMore: false, nextPage: null }],
      pageParams: [1]
    });

    // 1. Estando dentro del grupo eliminado -> elimina de caché y redirige a /messages?type=all
    const insideRender = renderSocketManager({
      initialRoute: "/messages/grp_del_1"
    });

    await waitFor(() => {
      expect(socketMock.getListenerCount("groupDeleted")).toBe(1);
    });

    act(() => {
      socketMock.emitServerEvent("groupDeleted", "grp_del_1");
    });

    const updatedChats = queryClient.getQueryData<
      InfiniteData<{ data: ChatType[] }>
    >(["chats", "all"]);
    expect(updatedChats?.pages[0].data.map((c) => c._id)).toEqual(["grp_keep_2"]);
    expect(screen.getByTestId("current-location").textContent).toBe(
      "/messages?type=all"
    );

    insideRender.unmount();

    // 2. Estando en otro chat -> elimina de caché pero NO redirige
    queryClient.setQueryData(["chats", "all"], {
      pages: [{ data: [groupToDelete, groupToKeep], hasMore: false, nextPage: null }],
      pageParams: [1]
    });

    renderSocketManager({
      initialRoute: "/messages/grp_keep_2"
    });

    await waitFor(() => {
      expect(socketMock.getListenerCount("groupDeleted")).toBe(1);
    });

    act(() => {
      socketMock.emitServerEvent("groupDeleted", "grp_del_1");
    });

    const chatsAfterOutsideDelete = queryClient.getQueryData<
      InfiniteData<{ data: ChatType[] }>
    >(["chats", "all"]);
    expect(chatsAfterOutsideDelete?.pages[0].data.map((c) => c._id)).toEqual([
      "grp_keep_2"
    ]);
    expect(screen.getByTestId("current-location").textContent).toBe(
      "/messages/grp_keep_2"
    );
  });

  it("actualiza stores efímeros (typing, stoppedTyping, recordingAudio, stoppedRecordingAudio) y desregistra todos los listeners al desmontar", async () => {
    const { unmount } = renderSocketManager({
      initialRoute: "/messages/chat_1",
      hasLocalCryptoKeys: true
    });

    await waitFor(() => {
      expect(socketMock.getListenerCount("typing")).toBe(1);
      expect(socketMock.getListenerCount("newMessage")).toBe(1);
    });

    const typingPayload = {
      chatId: "chat_1",
      user: {
        _id: otherUser._id,
        fullName: otherUser.fullName,
        username: otherUser.username,
        profilePicture: otherUser.profilePicture
      }
    };

    // typing / stoppedTyping
    act(() => {
      socketMock.emitServerEvent("typing", typingPayload);
    });
    expect(useUsersTyping.getState().usersTyping).toEqual([typingPayload]);

    act(() => {
      socketMock.emitServerEvent("stoppedTyping", {
        userId: otherUser._id,
        chatId: "chat_1"
      });
    });
    expect(useUsersTyping.getState().usersTyping).toEqual([]);

    // recordingAudio / stoppedRecordingAudio
    act(() => {
      socketMock.emitServerEvent("recordingAudio", typingPayload);
    });
    expect(useUsersRecordingAudio.getState().usersRecordingAudio).toEqual([
      typingPayload
    ]);

    act(() => {
      socketMock.emitServerEvent("stoppedRecordingAudio", typingPayload);
    });
    expect(useUsersRecordingAudio.getState().usersRecordingAudio).toEqual([]);

    // Al desmontar deben limpiarse TODOS los listeners sin fugas
    unmount();

    const allSubscribedEvents = [
      "connect",
      "disconnect",
      "setOnlineUsers",
      "newNotification",
      "deletedMessage",
      "typing",
      "stoppedTyping",
      "recordingAudio",
      "stoppedRecordingAudio",
      "groupCreated",
      "groupUpdated",
      "groupDeleted",
      "userLeftGroup",
      "userJoinedGroup",
      "messageSeenBy",
      "newMessage"
    ];

    for (const eventName of allSubscribedEvents) {
      expect(socketMock.getListenerCount(eventName), `listener leak on "${eventName}"`).toBe(0);
    }
  });
});
