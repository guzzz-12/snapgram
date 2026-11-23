import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mockIntersectionObserver } from "jsdom-testing-mocks";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import ChatInbox from "@/components/chat/ChatInbox";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { socket } from "@/utils/socket";
import type { ChatType } from "@/types/global";
import { server } from "../../mocks/server";
import { buildMockUser } from "../../mocks/users/factories";
import { buildMockChat } from "../../mocks/chats/factories";
import { getCachedMockKeyPair } from "../../mocks/cryptoKeys/factories";
import type { SocketMock } from "../../mocks/socket/socketMock";

vi.mock("@/utils/socket", async () => {
  const { createSocketMock } = await import("../../mocks/socket/socketMock");
  return { socket: createSocketMock() };
});

const socketMock = socket as unknown as SocketMock;

const MessagesListRouteProbe = () => {
  const location = useLocation();
  return (
    <div data-testid="messages-list-route">
      {location.pathname}
      {location.search}
    </div>
  );
};

/**
 * Suite de integración para la bandeja de entrada del chat (`src/components/chat/ChatInbox.tsx`).
 *
 * Propósito:
 *   Validar la coordinación de carga del chat y claves públicas de destinatarios, la visibilidad
 *   condicional de `ChatInput`, los estados de bloqueo iniciales y en tiempo real por Socket.IO,
 *   el aviso ante cuentas eliminadas y la gestión de errores 404/500.
 *
 * Qué evalúa y alcance (SUT):
 *   - Carga y chat activo: muestra skeletons mientras `useGetChatById` o
 *     `useGetRecipientsPublicKeys` están pendientes, y luego renderiza `ChatHeader`, `ChatContent`
 *     y `ChatInput` (tanto para chats privados, grupales y chats temporales `temp_*`).
 *   - Bloqueo inicial (`blockData`): oculta `ChatInput` y distingue el mensaje cuando el usuario
 *     actual bloqueó al contacto vs cuando fue bloqueado por él (usando el primer nombre).
 *   - Eventos Socket `"userBlocked"`: ignora eventos de otros chats, oculta `ChatInput` con el
 *     mensaje correcto al recibir `operation: "block"`, restaura `ChatInput` al recibir
 *     `operation: "unblock"`, y limpia el listener al desmontar.
 *   - Cuenta eliminada (`isPrivateChat && !otherUser`): oculta `ChatInput` y muestra
 *     `"No puedes enviar mensajes en esta conversación porque esta cuenta no existe."`.
 *   - Errores HTTP: ante `404` muestra `toast.error` y redirige a `"/messages?type=all"`; ante
 *     `500` muestra `toast.error` sin redirigir.
 */
describe("ChatInbox", () => {
  let queryClient: QueryClient;

  const currentUser = buildMockUser({
    _id: "usr_me_1",
    clerkId: "clerk_me_1",
    fullName: "Carlos Meza",
    username: "carlos_m",
    hasCryptoKeys: true
  });

  const otherUser = buildMockUser({
    _id: "usr_other_2",
    clerkId: "clerk_other_2",
    fullName: "Sofía Morales",
    username: "sofia_m",
    hasCryptoKeys: true
  });

  type RenderInboxOptions = {
    chatId?: string;
    temporaryChat?: ChatType | null;
    headerHeight?: number;
    initialRoute?: string;
  };

  const renderChatInbox = ({
    chatId = "chat_1",
    temporaryChat = null,
    headerHeight = 67,
    initialRoute = `/messages/${chatId}?type=all`
  }: RenderInboxOptions = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="/messages" element={<MessagesListRouteProbe />} />
            <Route
              path="/messages/:chatId"
              element={
                <ChatInbox
                  chatId={chatId}
                  temporaryChat={temporaryChat}
                  headerHeight={headerHeight}
                />
              }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    mockIntersectionObserver();
    socketMock.reset();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, retryDelay: 0 },
        mutations: { retry: false }
      }
    });
    useCurrentUser.setState({ user: currentUser, loadingUser: false });
  });

  afterEach(() => {
    cleanup();
    socketMock.reset();
    vi.restoreAllMocks();
    queryClient.clear();
    useCurrentUser.setState({ user: null, loadingUser: false });
  });

  describe("carga inicial y chats activos", () => {
    it("muestra skeletons mientras cargan chat y claves públicas y luego renderiza ChatHeader, ChatContent y ChatInput", async () => {
      let releaseChat!: () => void;
      const chatGate = new Promise<void>((resolve) => {
        releaseChat = resolve;
      });

      let markKeysRequested!: () => void;
      const keysRequested = new Promise<void>((resolve) => {
        markKeysRequested = resolve;
      });

      let releaseKeys!: () => void;
      const keysGate = new Promise<void>((resolve) => {
        releaseKeys = resolve;
      });

      const activeChat = buildMockChat({
        _id: "chat_private_1",
        type: "private",
        participants: [currentUser, otherUser],
        lastMessage: null
      });

      server.use(
        http.get("/api/chats/:chatId", async () => {
          await chatGate;
          return HttpResponse.json({
            data: activeChat,
            isBlocked: { blockedBy: null, blockedUser: null }
          });
        }),
        http.get("/api/crypto-keys/get-recipients-public-keys/:chatId", async () => {
          markKeysRequested();
          await keysGate;
          const { publicKeyJWK } = await getCachedMockKeyPair("primary");
          return HttpResponse.json({
            publicKeys: [{ userId: otherUser._id, publicKey: publicKeyJWK }]
          });
        }),
        http.get("/api/messages/chat/:chatId", () =>
          HttpResponse.json({
            data: { messages: [], chat: activeChat },
            hasMore: false,
            nextPage: null
          })
        )
      );

      renderChatInbox({ chatId: "chat_private_1" });

      // Mientras carga el chat: skeletons presentes y sin ChatInput ni alertas
      await waitFor(() => {
        expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
      });
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

      // Resolver el chat y esperar a que ya se haya disparado la consulta de claves públicas
      // (confirmando que fetchingExistingChat === false y solo loadingRecipientsCryptoKey === true)
      await act(async () => {
        releaseChat();
        await keysRequested;
      });
      expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

      // Resolver claves públicas: renderiza ChatHeader + ChatInput sin alertas
      act(() => {
        releaseKeys();
      });

      expect(await screen.findByText("Sofía Morales")).toBeInTheDocument();
      expect(await screen.findByRole("textbox")).toBeInTheDocument();
      expect(
        screen.queryByText(/No puedes enviar mensajes en esta conversación/i)
      ).not.toBeInTheDocument();
    });

    it("renderiza ChatHeader y ChatInput para un chat grupal sin mostrar alerta de cuenta inexistente", async () => {
      const groupChat = buildMockChat({
        _id: "chat_group_7",
        type: "group",
        groupName: "Equipo Snapgram",
        groupAdmin: currentUser,
        participants: [currentUser, otherUser],
        lastMessage: null
      });

      server.use(
        http.get("/api/chats/:chatId", () =>
          HttpResponse.json({
            data: groupChat,
            isBlocked: { blockedBy: null, blockedUser: null }
          })
        ),
        http.get("/api/messages/chat/:chatId", () =>
          HttpResponse.json({
            data: { messages: [], chat: groupChat },
            hasMore: false,
            nextPage: null
          })
        )
      );

      renderChatInbox({
        chatId: "chat_group_7",
        initialRoute: "/messages/chat_group_7?type=group"
      });

      expect(await screen.findByText("Equipo Snapgram")).toBeInTheDocument();
      expect(await screen.findByRole("textbox")).toBeInTheDocument();
      expect(
        screen.queryByText(/No puedes enviar mensajes en esta conversación/i)
      ).not.toBeInTheDocument();
    });

    it("carga la clave pública temporal para un chat temporal (temp_*) sin consultar /api/chats/:chatId", async () => {
      let chatByIdRequests = 0;
      let tempPublicKeyUserId: string | undefined;

      const tempChat = buildMockChat({
        _id: `temp_${otherUser._id}`,
        type: "private",
        participants: [otherUser],
        lastMessage: null
      });

      server.use(
        http.get("/api/chats/:chatId", () => {
          chatByIdRequests += 1;
          return HttpResponse.json({
            data: tempChat,
            isBlocked: { blockedBy: null, blockedUser: null }
          });
        }),
        http.get("*/crypto-keys/get-user-public-key/:userId", async ({ params }) => {
          tempPublicKeyUserId = params.userId as string;
          const { publicKeyJWK } = await getCachedMockKeyPair("primary");
          return HttpResponse.json({ data: publicKeyJWK });
        })
      );

      renderChatInbox({
        chatId: tempChat._id,
        temporaryChat: tempChat
      });

      expect(await screen.findByText("Sofía Morales")).toBeInTheDocument();
      expect(await screen.findByRole("textbox")).toBeInTheDocument();
      expect(tempPublicKeyUserId).toBe(otherUser._id);
      expect(chatByIdRequests).toBe(0);
    });
  });

  describe("estados de bloqueo iniciales y en tiempo real por Socket", () => {
    it("oculta ChatInput y muestra 'bloqueaste a <Nombre>' cuando blockData indica que el usuario actual bloqueó al otro", async () => {
      const activeChat = buildMockChat({
        _id: "chat_blocked_by_me",
        type: "private",
        participants: [currentUser, otherUser],
        lastMessage: null
      });

      server.use(
        http.get("/api/chats/:chatId", () =>
          HttpResponse.json({
            data: activeChat,
            isBlocked: {
              blockedBy: currentUser._id,
              blockedUser: otherUser._id
            }
          })
        ),
        http.get("/api/messages/chat/:chatId", () =>
          HttpResponse.json({
            data: { messages: [], chat: activeChat },
            hasMore: false,
            nextPage: null
          })
        )
      );

      renderChatInbox({ chatId: "chat_blocked_by_me" });

      expect(
        await screen.findByText(
          "No puedes enviar mensajes en esta conversación porque bloqueaste a Sofía"
        )
      ).toBeInTheDocument();
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });

    it("oculta ChatInput y muestra '<Nombre> te ha bloqueado.' cuando blockData indica que el otro usuario bloqueó al actual", async () => {
      const activeChat = buildMockChat({
        _id: "chat_blocked_me",
        type: "private",
        participants: [currentUser, otherUser],
        lastMessage: null
      });

      server.use(
        http.get("/api/chats/:chatId", () =>
          HttpResponse.json({
            data: activeChat,
            isBlocked: {
              blockedBy: otherUser._id,
              blockedUser: currentUser._id
            }
          })
        ),
        http.get("/api/messages/chat/:chatId", () =>
          HttpResponse.json({
            data: { messages: [], chat: activeChat },
            hasMore: false,
            nextPage: null
          })
        )
      );

      renderChatInbox({ chatId: "chat_blocked_me" });

      expect(
        await screen.findByText(
          "No puedes enviar mensajes en esta conversación porque Sofía te ha bloqueado."
        )
      ).toBeInTheDocument();
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });

    it("reacciona al evento socket 'userBlocked' (block/unblock), ignora eventos de otros chats y limpia el listener al desmontar", async () => {
      const activeChat = buildMockChat({
        _id: "chat_realtime_1",
        type: "private",
        participants: [currentUser, otherUser],
        lastMessage: null
      });

      server.use(
        http.get("/api/chats/:chatId", () =>
          HttpResponse.json({
            data: activeChat,
            isBlocked: { blockedBy: null, blockedUser: null }
          })
        ),
        http.get("/api/messages/chat/:chatId", () =>
          HttpResponse.json({
            data: { messages: [], chat: activeChat },
            hasMore: false,
            nextPage: null
          })
        )
      );

      const { unmount } = renderChatInbox({ chatId: "chat_realtime_1" });

      expect(await screen.findByRole("textbox")).toBeInTheDocument();
      expect(socketMock.getListenerCount("userBlocked")).toBe(1);

      // 1. Evento dirigido a OTRO chatId debe ignorarse por completo
      act(() => {
        socketMock.emitServerEvent("userBlocked", {
          user: otherUser,
          blockedUser: currentUser,
          operation: "block",
          chatId: "chat_distinto_999"
        });
      });

      expect(screen.getByRole("textbox")).toBeInTheDocument();
      expect(
        screen.queryByText(/No puedes enviar mensajes en esta conversación/i)
      ).not.toBeInTheDocument();

      // 2. Evento "block" del otro usuario sobre el chat activo oculta ChatInput
      act(() => {
        socketMock.emitServerEvent("userBlocked", {
          user: otherUser,
          blockedUser: currentUser,
          operation: "block",
          chatId: "chat_realtime_1"
        });
      });

      expect(
        await screen.findByText(
          "No puedes enviar mensajes en esta conversación porque Sofía te ha bloqueado."
        )
      ).toBeInTheDocument();
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

      // 3. Evento "unblock" sobre el chat activo restaura ChatInput
      act(() => {
        socketMock.emitServerEvent("userBlocked", {
          user: otherUser,
          blockedUser: currentUser,
          operation: "unblock",
          chatId: "chat_realtime_1"
        });
      });

      expect(await screen.findByRole("textbox")).toBeInTheDocument();
      expect(
        screen.queryByText(/No puedes enviar mensajes en esta conversación/i)
      ).not.toBeInTheDocument();

      // 4. Evento "block" iniciado por currentUser muestra el mensaje correspondiente
      act(() => {
        socketMock.emitServerEvent("userBlocked", {
          user: currentUser,
          blockedUser: otherUser,
          operation: "block",
          chatId: "chat_realtime_1"
        });
      });

      expect(
        await screen.findByText(
          "No puedes enviar mensajes en esta conversación porque bloqueaste a Sofía"
        )
      ).toBeInTheDocument();
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

      // 5. Al desmontar se remueve el listener de "userBlocked"
      unmount();
      expect(socketMock.getListenerCount("userBlocked")).toBe(0);
    });
  });

  describe("cuenta eliminada y manejo de errores HTTP", () => {
    it("oculta ChatInput y muestra la alerta de cuenta inexistente cuando el otro participante del chat privado ya no existe", async () => {
      const orphanedPrivateChat = buildMockChat({
        _id: "chat_deleted_user",
        type: "private",
        participants: [currentUser],
        lastMessage: null
      });

      server.use(
        http.get("/api/chats/:chatId", () =>
          HttpResponse.json({
            data: orphanedPrivateChat,
            isBlocked: { blockedBy: null, blockedUser: null }
          })
        ),
        http.get("/api/messages/chat/:chatId", () =>
          HttpResponse.json({
            data: { messages: [], chat: orphanedPrivateChat },
            hasMore: false,
            nextPage: null
          })
        )
      );

      renderChatInbox({ chatId: "chat_deleted_user" });

      expect(
        await screen.findByText(
          "No puedes enviar mensajes en esta conversación porque esta cuenta no existe."
        )
      ).toBeInTheDocument();
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.queryByText(/bloqueado|bloqueaste/i)).not.toBeInTheDocument();
    });

    it("muestra toast.error y redirige a /messages?type=all cuando useGetChatById devuelve 404", async () => {
      server.use(
        http.get("/api/chats/:chatId", () =>
          HttpResponse.json(
            { message: "Conversación no encontrada" },
            { status: 404 }
          )
        )
      );

      const toastErrorSpy = vi
        .spyOn(toast, "error")
        .mockImplementation(() => "toast-id");

      renderChatInbox({ chatId: "chat_missing_404" });

      expect(await screen.findByTestId("messages-list-route")).toHaveTextContent(
        "/messages?type=all"
      );
      expect(toastErrorSpy).toHaveBeenCalledWith("Conversación no encontrada");
    });

    it("muestra toast.error sin redirigir cuando useGetChatById devuelve un error 500", async () => {
      server.use(
        http.get("/api/chats/:chatId", () =>
          HttpResponse.json(
            { message: "Error interno al obtener chat" },
            { status: 500 }
          )
        )
      );

      const toastErrorSpy = vi
        .spyOn(toast, "error")
        .mockImplementation(() => "toast-id");

      renderChatInbox({ chatId: "chat_error_500" });

      await waitFor(() => {
        expect(toastErrorSpy).toHaveBeenCalledWith("Error interno al obtener chat");
      });

      expect(screen.queryByTestId("messages-list-route")).not.toBeInTheDocument();
    });
  });
});
