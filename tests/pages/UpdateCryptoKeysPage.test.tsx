import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation, type InitialEntry } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import UpdateCryptoKeysPage from "@/pages/UpdateCryptoKeysPage";
import { AuthContext, type AuthContext as AuthContextType } from "@/providers/AuthProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCheckLocalCryptoKeys } from "@/hooks/useCheckLocalCryptoKeys";
import { server } from "../mocks/server";
import { buildMockUser } from "../mocks/users/factories";

const MessagesRouteProbe = () => {
  const location = useLocation();
  return (
    <div data-testid="messages-route">
      {location.pathname}
      {location.search}
    </div>
  );
};

/**
 * Suite de integración para la página de actualización de PIN criptográfico
 * (`src/pages/UpdateCryptoKeysPage.tsx`).
 *
 * Propósito:
 *   Validar el flujo completo de actualización de PIN en dos pasos sobre
 *   `<CreateCryptoKeysScreen operation="update" />`, la confirmación destructiva previa al
 *   envío, la persistencia de claves locales y la redirección a mensajería.
 *
 * Qué evalúa y alcance (SUT):
 *   - Renderiza los textos del modo actualización y navega a `"/"` al pulsar `"Cancelar"`
 *     sin invocar `signOut`.
 *   - Tras ingresar y confirmar el nuevo PIN de 6 dígitos, abre `ConfirmationModal` sin enviar
 *     peticiones hasta confirmar; al confirmar envía `POST /api/crypto-keys/store-user-keys?operation=update`,
 *     persiste claves en `localStorage`, actualiza `useCheckLocalCryptoKeys` y redirige a
 *     `"/messages?type=all"`.
 *   - Muestra error y vuelve al paso 1 sin abrir `ConfirmationModal` si los PINs no coinciden,
 *     y retorna `null` cuando no hay usuario cargado.
 */
describe("UpdateCryptoKeysPage", () => {
  let queryClient: QueryClient;
  let signOutMock: ReturnType<typeof vi.fn>;

  const renderUpdateCryptoKeysPage = (
    initialEntries: InitialEntry[] = ["/update-crypto-keys"]
  ) => {
    const authValue: AuthContextType = {
      userId: "clerk_user_1",
      isLoaded: true,
      isSignedIn: true,
      signOut: signOutMock as unknown as AuthContextType["signOut"],
      getToken: vi.fn().mockResolvedValue("jwt-mock") as unknown as AuthContextType["getToken"]
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <MemoryRouter initialEntries={initialEntries}>
            <Routes>
              <Route path="/" element={<div data-testid="home-route">Home</div>} />
              <Route path="/messages" element={<MessagesRouteProbe />} />
              <Route path="/update-crypto-keys" element={<UpdateCryptoKeysPage />} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    localStorage.clear();
    signOutMock = vi.fn().mockResolvedValue(undefined);
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    useCurrentUser.setState({
      user: buildMockUser({
        _id: "usr_me_1",
        clerkId: "clerk_user_1",
        hasCryptoKeys: true
      }),
      loadingUser: false
    });
    useCheckLocalCryptoKeys.setState({ hasLocalCryptoKeys: false });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.restoreAllMocks();
    queryClient.clear();
    useCurrentUser.setState({ user: null, loadingUser: false });
    useCheckLocalCryptoKeys.setState({ hasLocalCryptoKeys: false });
  });

  it("renderiza CreateCryptoKeysScreen en modo 'update' y navega a '/' al cancelar sin llamar signOut", async () => {
    const user = userEvent.setup();

    renderUpdateCryptoKeysPage();

    expect(screen.getByTestId("create-crypto-keys-screen")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Actualizar pin de cifrado" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Actualiza tu pin de cifrado de extremo a extremo del chat.")
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(await screen.findByTestId("home-route")).toBeInTheDocument();
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it("abre ConfirmationModal tras ingresar y confirmar el PIN, envía operation='update' al confirmar, guarda claves y redirige a /messages?type=all", async () => {
    const user = userEvent.setup();

    const captured: {
      operation: string | null;
      payload: {
        privateKey?: string;
        publicKey?: JsonWebKey;
        salt?: string;
        iv?: string;
      } | null;
    } = {
      operation: null,
      payload: null
    };
    let postRequests = 0;

    server.use(
      http.post("/api/crypto-keys/store-user-keys", async ({ request }) => {
        postRequests += 1;
        captured.operation = new URL(request.url).searchParams.get("operation");
        captured.payload = (await request.json()) as {
          privateKey?: string;
          publicKey?: JsonWebKey;
          salt?: string;
          iv?: string;
        };

        return HttpResponse.json({
          publicKey: captured.payload.publicKey,
          privateKeyLock: {
            key: captured.payload.privateKey,
            salt: captured.payload.salt,
            iv: captured.payload.iv
          }
        });
      })
    );

    const toastSuccessSpy = vi
      .spyOn(toast, "success")
      .mockImplementation(() => "toast-id");

    renderUpdateCryptoKeysPage();

    // Paso 1: ingresar el nuevo PIN de 6 dígitos
    const step1Input = screen.getByRole("textbox");
    await user.type(step1Input, "654321");

    // Debe avanzar al paso 2 sin disparar peticiones aún
    expect(await screen.findByText("Confirma tu pin")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(postRequests).toBe(0);

    // Paso 2: confirmar el mismo PIN de 6 dígitos
    const step2Input = screen.getByRole("textbox");
    await user.type(step2Input, "654321");

    // En modo "update" debe pedir confirmación en ConfirmationModal antes de guardar
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByText(/Perderás permanentemente el acceso a los mensajes anteriores/i)
    ).toBeInTheDocument();
    expect(postRequests).toBe(0);

    // Confirmar la actualización
    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByTestId("messages-route")).toHaveTextContent(
      "/messages?type=all"
    );

    expect(postRequests).toBe(1);
    expect(captured.operation).toBe("update");
    expect(captured.payload?.privateKey).toBeTruthy();
    expect(captured.payload?.publicKey).toBeTruthy();
    expect(captured.payload?.salt).toBeTruthy();
    expect(captured.payload?.iv).toBeTruthy();

    expect(localStorage.getItem("publicKey")).toBeTruthy();
    expect(localStorage.getItem("privateKey")).toBeTruthy();
    expect(useCheckLocalCryptoKeys.getState().hasLocalCryptoKeys).toBe(true);
    expect(toastSuccessSpy).toHaveBeenCalledWith(
      "Cifrado habilitado exitosamente."
    );
  });

  it("notifica error y vuelve al paso 1 sin enviar peticiones si los PINs ingresados no coinciden", async () => {
    const user = userEvent.setup();
    let postRequests = 0;

    server.use(
      http.post("/api/crypto-keys/store-user-keys", () => {
        postRequests += 1;
        return HttpResponse.json({});
      })
    );

    const toastErrorSpy = vi
      .spyOn(toast, "error")
      .mockImplementation(() => "toast-id");

    renderUpdateCryptoKeysPage();

    await user.type(screen.getByRole("textbox"), "654321");
    expect(await screen.findByText("Confirma tu pin")).toBeInTheDocument();

    await user.type(screen.getByRole("textbox"), "111111");

    await waitFor(() => {
      expect(toastErrorSpy).toHaveBeenCalledWith(
        "Los pins no coinciden. Inténtalo de nuevo."
      );
    });

    expect(screen.queryByText("Confirma tu pin")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(postRequests).toBe(0);
  });

  it("retorna null si no hay usuario cargado en useCurrentUser", () => {
    useCurrentUser.setState({ user: null, loadingUser: false });

    const { container } = renderUpdateCryptoKeysPage();

    expect(container.firstChild).toBeNull();
  });
});
