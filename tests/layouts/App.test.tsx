import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, type InitialEntry } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import App from "@/App";
import { AuthContext, type AuthContext as AuthContextType } from "@/providers/AuthProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUnseenNotifications } from "@/hooks/useUnseenNotifications";
import { useUnreadChats } from "@/hooks/useUnreadChats";
import { axiosInstance } from "@/utils/axiosInstance";
import { server } from "../mocks/server";
import { buildMockUser } from "../mocks/users/factories";

// Evitar conexiones reales de Socket.IO al montar Layout
vi.mock("@/components/SocketManager", () => ({
  default: () => null
}));

// Aislamiento de páginas lazy para validar el bootstrap y enrutamiento de App.tsx
// sin disparar queries secundarias ni widgets de Clerk
vi.mock("@/pages/HomePage", () => ({
  default: () => <div data-testid="home-page">HomePage Mock</div>
}));

vi.mock("@/pages/AuthPage", () => ({
  default: ({ type }: { type: "login" | "signup" }) => (
    <div data-testid={`auth-page-${type}`}>AuthPage {type}</div>
  )
}));

vi.mock("@/pages/NotificationsPage", () => ({
  default: () => <div data-testid="notifications-page">NotificationsPage Mock</div>
}));

/**
 * Suite de integración para la inicialización global y enrutamiento (`src/App.tsx`).
 *
 * Propósito:
 *   Validar el arranque completo de la aplicación: sondeo `/ping` con reintentos,
 *   registro y limpieza del interceptor JWT de Axios, carga paralela de datos autenticados,
 *   hidratación de stores globales de Zustand, manejo de fallos críticos y protección de rutas.
 *
 * Qué evalúa y alcance (SUT):
 *   - Bootstrap autenticado: `GET /api/ping` previo, inyección de `Authorization: Bearer <token>`
 *     en `GET /api/users/me`, `GET /api/notifications/unseen` y `GET /api/chats/get-unread-chats`,
 *     hidratación de `useCurrentUser`, `useUnseenNotifications` y `useUnreadChats`, renderizado de
 *     `Layout` + `HomePage`, y eyección del interceptor al desmontar.
 *   - Usuario no autenticado: completa `GET /api/ping`, renderiza `AuthLayout` + `AuthPage`
 *     y mantiene bloqueadas las queries autenticadas (`canFetchAuthenticatedData === false`).
 *   - Fallo crítico de usuario (`userError`): tras agotar `retry: 2` en `/users/me`, notifica
 *     con `toast.error(errorMessage(userError))`, ejecuta `signOut()` y muestra
 *     `"Ocurrió un error al iniciar sesión."`.
 *   - Servidor caído (`serverError`): tras agotar `PING_RETRY` (7 intentos totales en `/ping`),
 *     renderiza `ErrorPage` con `"¡Oops! Algo salió mal"` sin disparar queries autenticadas.
 *   - Estado de carga (`!isLoaded`) y guardas de enrutamiento (`ProtectedRoute` y `NoAuthRoute`).
 */
describe("App (Inicialización global, hidratación de stores y enrutamiento)", () => {
  let queryClient: QueryClient;
  let signOutMock: ReturnType<typeof vi.fn>;
  let getTokenMock: ReturnType<typeof vi.fn>;

  type RenderAppOptions = {
    auth?: Partial<AuthContextType>;
    initialEntries?: InitialEntry[];
  };

  const renderApp = ({ auth = {}, initialEntries = ["/"] }: RenderAppOptions = {}) => {
    const authValue: AuthContextType = {
      userId: "clerk_auth_1",
      isLoaded: true,
      isSignedIn: true,
      signOut: signOutMock as unknown as AuthContextType["signOut"],
      getToken: getTokenMock as unknown as AuthContextType["getToken"],
      ...auth
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <MemoryRouter initialEntries={initialEntries}>
            <App />
          </MemoryRouter>
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  };

  const resetStores = () => {
    useCurrentUser.setState({ user: null, loadingUser: true });
    useUnseenNotifications.setState({ unseenNotifications: 0 });
    useUnreadChats.setState({ unreadChats: [] });
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          // Mantener el retry propio de cada hook/query en App.tsx sin demoras reales
          retryDelay: 0
        },
        mutations: { retry: false }
      }
    });

    signOutMock = vi.fn().mockResolvedValue(undefined);
    getTokenMock = vi.fn().mockResolvedValue("jwt-secret-token-123");
    resetStores();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    queryClient.clear();
    resetStores();
  });

  it("completa /ping, registra el interceptor JWT, hidrata los stores de Zustand, renderiza Layout + HomePage y limpia el interceptor al desmontar", async () => {
    const mockUser = buildMockUser({
      _id: "usr_bootstrap_1",
      clerkId: "clerk_auth_1",
      fullName: "Elena Rivas",
      username: "elena_r",
      isDisabled: false,
      hasCryptoKeys: true
    });

    const callOrder: string[] = [];
    const capturedAuthHeaders: Record<string, string | null> = {};

    server.use(
      http.get("/api/ping", () => {
        callOrder.push("ping");
        return HttpResponse.json({ message: "pong" });
      }),
      http.get("/api/users/me", ({ request }) => {
        callOrder.push("me");
        capturedAuthHeaders.me = request.headers.get("authorization");
        return HttpResponse.json({ data: mockUser });
      }),
      http.get("/api/notifications/unseen", ({ request }) => {
        callOrder.push("notifications");
        capturedAuthHeaders.notifications = request.headers.get("authorization");
        return HttpResponse.json({ data: 7 });
      }),
      http.get("/api/chats/get-unread-chats", ({ request }) => {
        callOrder.push("unreadChats");
        capturedAuthHeaders.unreadChats = request.headers.get("authorization");
        return HttpResponse.json({
          data: ["chat_unread_1", "chat_unread_2"]
        });
      })
    );

    const { unmount } = renderApp();

    // Debe renderizar HomePage dentro de Layout
    expect(await screen.findByTestId("home-page")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-wrapper")).toBeInTheDocument();
    expect(screen.queryByTestId("auth-page-login")).not.toBeInTheDocument();

    // /ping debe haberse ejecutado primero y las 3 queries autenticadas deben llevar el JWT del interceptor
    expect(callOrder[0]).toBe("ping");
    expect(callOrder).toEqual(
      expect.arrayContaining(["ping", "me", "notifications", "unreadChats"])
    );
    expect(capturedAuthHeaders).toEqual({
      me: "Bearer jwt-secret-token-123",
      notifications: "Bearer jwt-secret-token-123",
      unreadChats: "Bearer jwt-secret-token-123"
    });

    // Stores de Zustand hidratados con los datos exactos del servidor
    expect(useCurrentUser.getState().user).toEqual(mockUser);
    expect(useCurrentUser.getState().loadingUser).toBe(false);
    expect(useUnseenNotifications.getState().unseenNotifications).toBe(7);
    expect(useUnreadChats.getState().unreadChats).toEqual([
      "chat_unread_1",
      "chat_unread_2"
    ]);

    // Al desmontar App, el interceptor de Axios debe haberse eyectado
    let postUnmountAuthHeader: string | null = "unexpected";
    server.use(
      http.get("/api/ping", ({ request }) => {
        postUnmountAuthHeader = request.headers.get("authorization");
        return HttpResponse.json({ message: "pong" });
      })
    );

    unmount();
    await axiosInstance.get("/ping");

    expect(postUnmountAuthHeader).toBeNull();
  });

  it("completa /ping y renderiza AuthLayout + AuthPage sin disparar queries autenticadas cuando el usuario no está autenticado", async () => {
    let pingCount = 0;
    let meCount = 0;
    let notificationsCount = 0;
    let unreadChatsCount = 0;

    server.use(
      http.get("/api/ping", () => {
        pingCount += 1;
        return HttpResponse.json({ message: "pong" });
      }),
      http.get("/api/users/me", () => {
        meCount += 1;
        return HttpResponse.json({ data: buildMockUser() });
      }),
      http.get("/api/notifications/unseen", () => {
        notificationsCount += 1;
        return HttpResponse.json({ data: 3 });
      }),
      http.get("/api/chats/get-unread-chats", () => {
        unreadChatsCount += 1;
        return HttpResponse.json({ data: ["chat_1"] });
      })
    );

    renderApp({
      auth: {
        userId: null,
        isSignedIn: false,
        isLoaded: true
      }
    });

    expect(await screen.findByTestId("auth-page-login")).toBeInTheDocument();
    expect(screen.getByText("SnapGram")).toBeInTheDocument();
    expect(screen.getByText(/todos los derechos reservados/i)).toBeInTheDocument();
    expect(screen.queryByTestId("sidebar-wrapper")).not.toBeInTheDocument();
    expect(screen.queryByTestId("home-page")).not.toBeInTheDocument();

    expect(pingCount).toBe(1);
    expect(meCount).toBe(0);
    expect(notificationsCount).toBe(0);
    expect(unreadChatsCount).toBe(0);
    expect(useCurrentUser.getState().user).toBeNull();
  });

  it("muestra toast de error, invoca signOut() y notifica 'Ocurrió un error al iniciar sesión.' cuando falla /api/users/me", async () => {
    let meAttempts = 0;

    server.use(
      http.get("/api/ping", () => {
        return HttpResponse.json({ message: "pong" });
      }),
      http.get("/api/users/me", () => {
        meAttempts += 1;
        return HttpResponse.json(
          { message: "Token de sesión inválido" },
          { status: 401 }
        );
      }),
      http.get("/api/notifications/unseen", () => {
        return HttpResponse.json({ data: 0 });
      }),
      http.get("/api/chats/get-unread-chats", () => {
        return HttpResponse.json({ data: [] });
      })
    );

    const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "toast-id");

    renderApp();

    await waitFor(() => {
      expect(signOutMock).toHaveBeenCalledTimes(1);
      expect(toastErrorSpy).toHaveBeenCalledWith(
        "Ocurrió un error al iniciar sesión."
      );
    });

    // useGetCurrentUser define retry: 2 => 1 intento inicial + 2 reintentos = 3
    expect(meAttempts).toBe(3);
    expect(toastErrorSpy).toHaveBeenCalledWith("Token de sesión inválido");
    expect(useCurrentUser.getState().user).toBeNull();
  });

  it("renderiza ErrorPage con '¡Oops! Algo salió mal' tras agotar los reintentos de GET /api/ping sin disparar queries autenticadas", async () => {
    let pingAttempts = 0;
    let meAttempts = 0;
    let notificationsAttempts = 0;
    let unreadChatsAttempts = 0;

    server.use(
      http.get("/api/ping", () => {
        pingAttempts += 1;
        return HttpResponse.json({ message: "Service Unavailable" }, { status: 503 });
      }),
      http.get("/api/users/me", () => {
        meAttempts += 1;
        return HttpResponse.json({ data: buildMockUser() });
      }),
      http.get("/api/notifications/unseen", () => {
        notificationsAttempts += 1;
        return HttpResponse.json({ data: 0 });
      }),
      http.get("/api/chats/get-unread-chats", () => {
        unreadChatsAttempts += 1;
        return HttpResponse.json({ data: [] });
      })
    );

    renderApp();

    expect(
      await screen.findByRole("heading", { name: "¡Oops! Algo salió mal" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Actualiza la página e inténtalo de nuevo")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reintentar/i })).toBeInTheDocument();

    // PING_RETRY = 6 => 1 intento inicial + 6 reintentos = 7 intentos totales
    expect(pingAttempts).toBe(7);
    expect(meAttempts).toBe(0);
    expect(notificationsAttempts).toBe(0);
    expect(unreadChatsAttempts).toBe(0);
    expect(screen.queryByTestId("home-page")).not.toBeInTheDocument();
    expect(screen.queryByTestId("auth-page-login")).not.toBeInTheDocument();
  });

  it("mantiene la pantalla de carga y no renderiza rutas mientras isLoaded es false", async () => {
    let pingCount = 0;
    let meCount = 0;

    server.use(
      http.get("/api/ping", () => {
        pingCount += 1;
        return HttpResponse.json({ message: "pong" });
      }),
      http.get("/api/users/me", () => {
        meCount += 1;
        return HttpResponse.json({ data: buildMockUser() });
      })
    );

    renderApp({
      auth: {
        userId: null,
        isSignedIn: false,
        isLoaded: false
      }
    });

    await waitFor(() => {
      expect(pingCount).toBe(1);
    });

    expect(screen.queryByTestId("auth-page-login")).not.toBeInTheDocument();
    expect(screen.queryByTestId("home-page")).not.toBeInTheDocument();
    expect(screen.queryByText("¡Oops! Algo salió mal")).not.toBeInTheDocument();
    expect(meCount).toBe(0);
  });

  it("redirige a /login (AuthPage) cuando un usuario no autenticado intenta acceder a una ruta protegida", async () => {
    renderApp({
      auth: {
        userId: null,
        isSignedIn: false,
        isLoaded: true
      },
      initialEntries: ["/notifications"]
    });

    expect(await screen.findByTestId("auth-page-login")).toBeInTheDocument();
    expect(screen.queryByTestId("notifications-page")).not.toBeInTheDocument();
  });

  it("redirige a / (HomePage) mediante NoAuthRoute cuando un usuario autenticado visita /login y permite navegar a rutas protegidas como /notifications", async () => {
    const mockUser = buildMockUser({
      clerkId: "clerk_auth_1",
      isDisabled: false,
      hasCryptoKeys: true
    });

    server.use(
      http.get("/api/users/me", () => HttpResponse.json({ data: mockUser }))
    );

    const { unmount } = renderApp({
      initialEntries: ["/login"]
    });

    expect(await screen.findByTestId("home-page")).toBeInTheDocument();
    expect(screen.queryByTestId("auth-page-login")).not.toBeInTheDocument();

    unmount();

    renderApp({
      initialEntries: ["/notifications"]
    });

    expect(await screen.findByTestId("notifications-page")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-wrapper")).toBeInTheDocument();
    expect(screen.queryByTestId("auth-page-login")).not.toBeInTheDocument();
  });
});
