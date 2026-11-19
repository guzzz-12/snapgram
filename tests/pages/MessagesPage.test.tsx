import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, type InitialEntry } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mockIntersectionObserver } from "jsdom-testing-mocks";
import { http, HttpResponse } from "msw";
import MessagesPage from "@/pages/MessagesPage";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCheckLocalCryptoKeys } from "@/hooks/useCheckLocalCryptoKeys";
import { usePrivateChatsListModal } from "@/hooks/usePrivateChatsListModal";
import { useTemporaryChat } from "@/hooks/useTemporaryChat";
import { server } from "../mocks/server";
import { buildMockUser } from "../mocks/users/factories";
import { buildMockChat } from "../mocks/chats/factories";

/**
 * Suite de integración para la página de mensajería (`src/pages/MessagesPage.tsx`).
 *
 * Propósito:
 *   Validar la orquestación de vistas, guardas criptográficas y modales de mensajería
 *   según el estado del usuario autenticado, la presencia de claves locales/remotas,
 *   el parámetro de ruta `:chatId` y el filtro de consulta `?type=all|group`.
 *
 * Qué evalúa y alcance (SUT):
 *   - Guardia de usuario no cargado: cuando `useCurrentUser` tiene `user: null`, retorna `null`
 *     sin renderizar contenido ni consultar `/api/chats`.
 *   - Estado vacío (`?type=all`): muestra `"Enviar mensaje"` y el botón `"Nuevo mensaje"` en la
 *     sección principal, que abre `PrivateChatsModalList` vía `usePrivateChatsListModal`.
 *   - Estado vacío (`?type=group`): muestra `"Crear grupo"` y el trigger de `CreateGroupChatModal`,
 *     ocultando `"Nuevo mensaje"` en la sección principal.
 *   - Claves locales ausentes (`hasLocalCryptoKeys === false`): renderiza `<GetCryptoKeys />`
 *     y bloquea `<ChatInbox />` y el estado vacío incluso cuando existe `:chatId` en la ruta.
 *   - Claves remotas ausentes (`user.hasCryptoKeys === false`): bloquea `<ChatInbox />` y el
 *     estado vacío sin disparar consultas del chat activo.
 *   - Conversación activa (`/messages/:chatId`): renderiza `<ChatList />` junto con `<ChatInbox />`
 *     hidratado desde `GET /api/chats/:chatId`, ocultando el estado vacío y `<GetCryptoKeys />`.
 */
describe("MessagesPage", () => {
  let queryClient: QueryClient;

  const renderMessagesPage = (initialEntries: InitialEntry[]) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/messages/:chatId" element={<MessagesPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  const getMainSection = (container: HTMLElement): HTMLElement => {
    const section = container.querySelector("main > section");
    if (!section) {
      throw new Error("No se encontró la sección principal dentro de <main>");
    }
    return section as HTMLElement;
  };

  const resetStores = () => {
    useCurrentUser.setState({ user: null, loadingUser: false });
    useCheckLocalCryptoKeys.setState({ hasLocalCryptoKeys: false });
    usePrivateChatsListModal.setState({ isOpen: false });
    useTemporaryChat.setState({ chat: null });
  };

  beforeEach(() => {
    mockIntersectionObserver();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    resetStores();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    queryClient.clear();
    resetStores();
  });

  it("no renderiza contenido ni dispara consultas de chats cuando useCurrentUser tiene user: null", () => {
    let chatsRequests = 0;

    server.use(
      http.get("/api/chats", () => {
        chatsRequests += 1;
        return HttpResponse.json({ data: [], hasMore: false, nextPage: null });
      })
    );

    useCurrentUser.setState({ user: null, loadingUser: false });
    useCheckLocalCryptoKeys.setState({ hasLocalCryptoKeys: true });

    const { container } = renderMessagesPage(["/messages?type=all"]);

    expect(container.firstChild).toBeNull();
    expect(chatsRequests).toBe(0);
  });

  it("muestra estado vacío para ?type=all y abre PrivateChatsModalList al pulsar 'Nuevo mensaje'", async () => {
    const user = userEvent.setup();
    let capturedChatType: string | null = null;

    server.use(
      http.get("/api/chats", ({ request }) => {
        capturedChatType = new URL(request.url).searchParams.get("type");
        return HttpResponse.json({ data: [], hasMore: false, nextPage: null });
      })
    );

    const currentUser = buildMockUser({ hasCryptoKeys: true });
    useCurrentUser.setState({ user: currentUser, loadingUser: false });
    useCheckLocalCryptoKeys.setState({ hasLocalCryptoKeys: true });

    const { container } = renderMessagesPage(["/messages?type=all"]);
    const section = getMainSection(container);

    expect(
      within(section).getByRole("heading", { name: "Enviar mensaje" })
    ).toBeInTheDocument();
    expect(
      within(section).getByText("Envía mensajes a tus amigos o grupos")
    ).toBeInTheDocument();

    const newMessageBtn = within(section).getByRole("button", {
      name: "Nuevo mensaje"
    });
    expect(newMessageBtn).toBeInTheDocument();
    expect(
      within(section).queryByRole("button", { name: "Crear grupo" })
    ).not.toBeInTheDocument();
    expect(
      within(section).queryByText("Introduce tu pin de cifrado")
    ).not.toBeInTheDocument();

    await waitFor(() => {
      expect(capturedChatType).toBe("all");
    });

    await user.click(newMessageBtn);

    expect(usePrivateChatsListModal.getState().isOpen).toBe(true);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Chatear" })).toBeInTheDocument();
  });

  it("muestra estado vacío para ?type=group y permite abrir CreateGroupChatModal al pulsar 'Crear grupo'", async () => {
    const user = userEvent.setup();
    let capturedChatType: string | null = null;

    server.use(
      http.get("/api/chats", ({ request }) => {
        capturedChatType = new URL(request.url).searchParams.get("type");
        return HttpResponse.json({ data: [], hasMore: false, nextPage: null });
      })
    );

    const currentUser = buildMockUser({ hasCryptoKeys: true });
    useCurrentUser.setState({ user: currentUser, loadingUser: false });
    useCheckLocalCryptoKeys.setState({ hasLocalCryptoKeys: true });

    const { container } = renderMessagesPage(["/messages?type=group"]);
    const section = getMainSection(container);

    expect(
      within(section).getByRole("heading", { name: "Crear grupo" })
    ).toBeInTheDocument();

    const createGroupBtn = within(section).getByRole("button", {
      name: "Crear grupo"
    });
    expect(createGroupBtn).toBeInTheDocument();
    expect(
      within(section).queryByRole("heading", { name: "Enviar mensaje" })
    ).not.toBeInTheDocument();
    expect(
      within(section).queryByRole("button", { name: "Nuevo mensaje" })
    ).not.toBeInTheDocument();

    await waitFor(() => {
      expect(capturedChatType).toBe("group");
    });

    await user.click(createGroupBtn);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("renderiza GetCryptoKeys y bloquea ChatInbox y estado vacío cuando hasLocalCryptoKeys es false", async () => {
    let chatByIdRequests = 0;
    let chatMessagesRequests = 0;

    server.use(
      http.get("/api/chats/:chatId", () => {
        chatByIdRequests += 1;
        return HttpResponse.json({
          data: buildMockChat(),
          isBlocked: { blockedBy: null, blockedUser: null }
        });
      }),
      http.get("/api/messages/chat/:chatId", () => {
        chatMessagesRequests += 1;
        return HttpResponse.json({
          data: { messages: [], chat: buildMockChat() },
          hasMore: false,
          nextPage: null
        });
      })
    );

    const currentUser = buildMockUser({ hasCryptoKeys: true });
    useCurrentUser.setState({ user: currentUser, loadingUser: false });
    useCheckLocalCryptoKeys.setState({ hasLocalCryptoKeys: false });

    const { container } = renderMessagesPage(["/messages/chat_locked_1?type=all"]);
    const section = getMainSection(container);

    expect(
      within(section).getByRole("heading", { name: "Introduce tu pin de cifrado" })
    ).toBeInTheDocument();
    expect(
      within(section).getByText("Introduce tu pin de 6 digitos para cargar tus chats.")
    ).toBeInTheDocument();

    expect(
      within(section).queryByRole("button", { name: "Nuevo mensaje" })
    ).not.toBeInTheDocument();
    expect(
      within(section).queryByRole("heading", { name: "Enviar mensaje" })
    ).not.toBeInTheDocument();

    await waitFor(() => {
      expect(chatByIdRequests).toBe(0);
      expect(chatMessagesRequests).toBe(0);
    });
  });

  it("no renderiza ChatInbox ni el estado vacío cuando user.hasCryptoKeys es false aunque hasLocalCryptoKeys sea true", async () => {
    let chatsListRequests = 0;
    let chatByIdRequests = 0;

    server.use(
      http.get("/api/chats", () => {
        chatsListRequests += 1;
        return HttpResponse.json({ data: [], hasMore: false, nextPage: null });
      }),
      http.get("/api/chats/:chatId", () => {
        chatByIdRequests += 1;
        return HttpResponse.json({
          data: buildMockChat(),
          isBlocked: { blockedBy: null, blockedUser: null }
        });
      })
    );

    const currentUser = buildMockUser({ hasCryptoKeys: false });
    useCurrentUser.setState({ user: currentUser, loadingUser: false });
    useCheckLocalCryptoKeys.setState({ hasLocalCryptoKeys: true });

    const { container } = renderMessagesPage([
      "/messages/chat_no_remote_keys?type=all"
    ]);
    const section = getMainSection(container);

    await waitFor(() => {
      expect(chatsListRequests).toBe(1);
    });

    expect(
      within(section).queryByRole("heading", { name: "Enviar mensaje" })
    ).not.toBeInTheDocument();
    expect(
      within(section).queryByRole("button", { name: "Nuevo mensaje" })
    ).not.toBeInTheDocument();
    expect(
      within(section).queryByRole("heading", { name: "Introduce tu pin de cifrado" })
    ).not.toBeInTheDocument();
    expect(within(section).queryByRole("textbox")).not.toBeInTheDocument();
    expect(chatByIdRequests).toBe(0);
  });

  it("renderiza ChatList junto con ChatInbox hidratado cuando existe :chatId y el usuario tiene claves locales y remotas", async () => {
    const currentUser = buildMockUser({
      _id: "usr_me_1",
      fullName: "Carlos Meza",
      username: "carlos_m",
      hasCryptoKeys: true
    });
    const otherUser = buildMockUser({
      _id: "usr_other_2",
      fullName: "Sofía Morales",
      username: "sofia_m",
      hasCryptoKeys: true
    });

    const activeChat = buildMockChat({
      _id: "chat_active_42",
      type: "private",
      participants: [currentUser, otherUser],
      lastMessage: null
    });

    let capturedChatId: string | undefined;

    server.use(
      http.get("/api/chats", () => {
        return HttpResponse.json({
          data: [activeChat],
          hasMore: false,
          nextPage: null
        });
      }),
      http.get("/api/chats/:chatId", ({ params }) => {
        capturedChatId = params.chatId as string;
        return HttpResponse.json({
          data: activeChat,
          isBlocked: { blockedBy: null, blockedUser: null }
        });
      }),
      http.get("/api/messages/chat/:chatId", () => {
        return HttpResponse.json({
          data: {
            messages: [],
            chat: activeChat
          },
          hasMore: false,
          nextPage: null
        });
      })
    );

    useCurrentUser.setState({ user: currentUser, loadingUser: false });
    useCheckLocalCryptoKeys.setState({ hasLocalCryptoKeys: true });

    const { container } = renderMessagesPage(["/messages/chat_active_42?type=all"]);
    const section = getMainSection(container);
    const sidebar = screen.getByRole("complementary");

    // ChatInbox solicita el chat activo por su chatId
    await waitFor(() => {
      expect(capturedChatId).toBe("chat_active_42");
    });

    // ChatList (<aside>) muestra el chat y ChatInbox (<section>) renderiza la cabecera e input
    expect(await within(sidebar).findByText("Sofía Morales")).toBeInTheDocument();
    expect(await within(section).findByText("Sofía Morales")).toBeInTheDocument();
    expect(within(section).getByRole("textbox")).toBeInTheDocument();

    expect(
      within(section).queryByRole("heading", { name: "Enviar mensaje" })
    ).not.toBeInTheDocument();
    expect(
      within(section).queryByRole("button", { name: "Nuevo mensaje" })
    ).not.toBeInTheDocument();
    expect(
      within(section).queryByRole("heading", { name: "Introduce tu pin de cifrado" })
    ).not.toBeInTheDocument();
  });
});
