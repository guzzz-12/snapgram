import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation, type InitialEntry } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import CreateCryptoKeysScreen from "@/components/CreateCryptoKeysScreen";
import GetCryptoKeys from "@/components/chat/GetCryptoKeys";
import { AuthContext, type AuthContext as AuthContextType } from "@/providers/AuthProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCheckLocalCryptoKeys } from "@/hooks/useCheckLocalCryptoKeys";
import { protectPrivateKey } from "@/utils/encryptDecryptPrivateKey";
import { server } from "../mocks/server";
import { buildMockUser } from "../mocks/users/factories";
import { getCachedMockKeyPair } from "../mocks/cryptoKeys/factories";

const LocationProbe = () => {
  const location = useLocation();
  return (
    <div data-testid="current-location">
      {location.pathname}
      {location.search}
    </div>
  );
};

/**
 * Suite de integración para las pantallas de creación y desbloqueo de PIN criptográfico
 * (`src/components/CreateCryptoKeysScreen.tsx` y `src/components/chat/GetCryptoKeys.tsx`).
 *
 * Propósito:
 *   Validar el flujo completo de creación inicial del PIN en dos pasos, la validación de
 *   coincidencia, la persistencia de claves criptográficas reales, la desbloqueo del historial
 *   mediante PIN en `GetCryptoKeys` y el manejo de errores (PIN incorrecto vs error de servidor).
 *
 * Qué evalúa y alcance (SUTs):
 *   - `CreateCryptoKeysScreen` (`operation="create"`):
 *     - Renderiza textos propios de creación inicial y al pulsar `"Cancelar"` ejecuta `signOut()`.
 *     - Avanza del paso 1 al paso 2 (`"Confirma tu pin"`) al ingresar 6 dígitos sin enviar HTTP.
 *     - Al confirmar con el mismo PIN en modo `"create"`, omite `ConfirmationModal`, envía
 *       `POST /api/crypto-keys/store-user-keys?operation=create`, guarda claves en `localStorage`,
 *       muestra `toast.success("Cifrado habilitado exitosamente.")`, actualiza `user.hasCryptoKeys`
 *       y `hasLocalCryptoKeys` a `true`, y permanece en la ruta actual.
 *     - Si los PINs no coinciden, muestra `toast.error("Los pins no coinciden. Inténtalo de nuevo.")`,
 *       regresa al paso 1 sin enviar peticiones y permite reintentar con éxito.
 *     - Retorna `null` cuando `useCurrentUser` tiene `user: null`.
 *   - `GetCryptoKeys`:
 *     - Permanece inactiva mientras el PIN tenga menos de 6 dígitos (`enabled: pin.length === 6`).
 *     - Al completar 6 dígitos, muestra spinner y deshabilita el `OTPInput` durante la carga,
 *       desencripta la clave privada real en `GET /api/crypto-keys/get-my-keys`, guarda ambas
 *       claves en `localStorage` y actualiza `hasLocalCryptoKeys` y `hasCryptoKeys` a `true`.
 *     - Si la desencriptación falla con `"PIN incorrecto."`, limpia el PIN (`""`), ejecuta
 *       `toast.dismiss()` + `toast.error("PIN incorrecto.")` y devuelve el foco al `OTPInput`.
 *     - Ante un error HTTP ajeno a PIN incorrecto (ej. 500), conserva el valor del PIN y muestra
 *       el mensaje del backend; resetea `["getMyCryptoKeys"]` al desmontar y enlaza a `"/update-crypto-keys"`.
 */
describe("CryptoKeysScreens (CreateCryptoKeysScreen y GetCryptoKeys)", () => {
  let queryClient: QueryClient;
  let signOutMock: ReturnType<typeof vi.fn>;

  const renderScreen = (
    ui: "create" | "get",
    initialEntries: InitialEntry[] = ["/"]
  ) => {
    const authValue: AuthContextType = {
      userId: "clerk_user_1",
      isLoaded: true,
      isSignedIn: true,
      signOut: signOutMock as unknown as AuthContextType["signOut"],
      getToken: vi.fn().mockResolvedValue("jwt-mock") as unknown as AuthContextType["getToken"]
    };

    const element =
      ui === "create" ? <CreateCryptoKeysScreen operation="create" /> : <GetCryptoKeys />;

    return render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <MemoryRouter initialEntries={initialEntries}>
            <Routes>
              <Route
                path="/"
                element={
                  <>
                    <LocationProbe />
                    {element}
                  </>
                }
              />
              <Route
                path="/messages"
                element={<div data-testid="messages-route">Messages</div>}
              />
              <Route
                path="/update-crypto-keys"
                element={<div data-testid="update-keys-route">Update Keys</div>}
              />
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
        hasCryptoKeys: false
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

  describe("CreateCryptoKeysScreen (operation='create')", () => {
    it("completa el flujo de 2 pasos sin ConfirmationModal, invoca POST ?operation=create, muestra toast de éxito y actualiza hasCryptoKeys y hasLocalCryptoKeys", async () => {
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

      renderScreen("create", ["/"]);

      expect(screen.getByTestId("create-crypto-keys-screen")).toBeInTheDocument();
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: "Habilita el cifrado de extremo a extremo del chat"
        })
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Si pierdes este pin no podrás recuperar tu historial de mensajes."
        )
      ).toBeInTheDocument();

      // Paso 1: ingresar PIN de 6 dígitos
      await user.type(screen.getByRole("textbox"), "123456");

      expect(await screen.findByText("Confirma tu pin")).toBeInTheDocument();
      expect(postRequests).toBe(0);

      // Paso 2: confirmar con el mismo PIN
      await user.type(screen.getByRole("textbox"), "123456");

      await waitFor(() => {
        expect(toastSuccessSpy).toHaveBeenCalledWith(
          "Cifrado habilitado exitosamente."
        );
      });

      // En modo "create" nunca abre ConfirmationModal ni navega a /messages
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByTestId("current-location")).toHaveTextContent("/");
      expect(screen.queryByTestId("messages-route")).not.toBeInTheDocument();

      expect(postRequests).toBe(1);
      expect(captured.operation).toBe("create");
      expect(captured.payload?.privateKey).toBeTruthy();
      expect(captured.payload?.publicKey).toBeTruthy();
      expect(captured.payload?.salt).toBeTruthy();
      expect(captured.payload?.iv).toBeTruthy();

      expect(useCurrentUser.getState().user?.hasCryptoKeys).toBe(true);
      expect(useCheckLocalCryptoKeys.getState().hasLocalCryptoKeys).toBe(true);
      expect(localStorage.getItem("publicKey")).toBeTruthy();
      expect(localStorage.getItem("privateKey")).toBeTruthy();

      // Al completar vuelve internamente al paso 1
      expect(screen.queryByText("Confirma tu pin")).not.toBeInTheDocument();
    });

    it("muestra toast de error y regresa al paso 1 si los PINs no coinciden, permitiendo reintentar después", async () => {
      const user = userEvent.setup();
      let postRequests = 0;

      server.use(
        http.post("/api/crypto-keys/store-user-keys", async ({ request }) => {
          postRequests += 1;
          const body = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({
            publicKey: body.publicKey,
            privateKeyLock: {
              key: body.privateKey,
              salt: body.salt,
              iv: body.iv
            }
          });
        })
      );

      const toastErrorSpy = vi
        .spyOn(toast, "error")
        .mockImplementation(() => "toast-id");
      const toastSuccessSpy = vi
        .spyOn(toast, "success")
        .mockImplementation(() => "toast-id");

      renderScreen("create", ["/"]);

      // Paso 1 -> Paso 2 con PIN distinto
      await user.type(screen.getByRole("textbox"), "123456");
      expect(await screen.findByText("Confirma tu pin")).toBeInTheDocument();

      await user.type(screen.getByRole("textbox"), "654321");

      await waitFor(() => {
        expect(toastErrorSpy).toHaveBeenCalledWith(
          "Los pins no coinciden. Inténtalo de nuevo."
        );
      });

      expect(screen.queryByText("Confirma tu pin")).not.toBeInTheDocument();
      expect(postRequests).toBe(0);
      expect(useCheckLocalCryptoKeys.getState().hasLocalCryptoKeys).toBe(false);

      // Reintento completo con PIN coincidente
      await user.type(screen.getByRole("textbox"), "246810");
      expect(await screen.findByText("Confirma tu pin")).toBeInTheDocument();
      await user.type(screen.getByRole("textbox"), "246810");

      await waitFor(() => {
        expect(toastSuccessSpy).toHaveBeenCalledWith(
          "Cifrado habilitado exitosamente."
        );
      });

      expect(postRequests).toBe(1);
      expect(useCheckLocalCryptoKeys.getState().hasLocalCryptoKeys).toBe(true);
    });

    it("invoca signOut() al hacer clic en 'Cancelar' en modo 'create'", async () => {
      const user = userEvent.setup();

      renderScreen("create", ["/"]);

      await user.click(screen.getByRole("button", { name: "Cancelar" }));

      expect(signOutMock).toHaveBeenCalledTimes(1);
    });

    it("retorna null si useCurrentUser no tiene usuario", () => {
      useCurrentUser.setState({ user: null, loadingUser: false });

      const { container } = renderScreen("create", ["/"]);

      expect(container.querySelector("[data-testid='create-crypto-keys-screen']")).not.toBeInTheDocument();
    });
  });

  describe("GetCryptoKeys", () => {
    it("no dispara la consulta con menos de 6 dígitos y, al ingresar el PIN correcto de 6 dígitos, desencripta las claves y actualiza hasLocalCryptoKeys(true)", async () => {
      const user = userEvent.setup();
      let getRequests = 0;

      const { publicKeyJWK, privateKeyJWK } = await getCachedMockKeyPair("primary");
      const { encryptedKey, salt, iv } = await protectPrivateKey(
        privateKeyJWK,
        "123456"
      );

      let markStarted!: () => void;
      const requestStarted = new Promise<void>((resolve) => {
        markStarted = resolve;
      });
      let releaseResponse!: () => void;
      const responseGate = new Promise<void>((resolve) => {
        releaseResponse = resolve;
      });

      server.use(
        http.get("/api/crypto-keys/get-my-keys", async () => {
          getRequests += 1;
          markStarted();
          await responseGate;

          return HttpResponse.json({
            publicKey: publicKeyJWK,
            privateKeyLock: {
              key: encryptedKey,
              salt,
              iv
            }
          });
        })
      );

      renderScreen("get", ["/"]);

      expect(
        screen.getByRole("heading", { level: 2, name: "Introduce tu pin de cifrado" })
      ).toBeInTheDocument();

      const otpInput = screen.getByRole("textbox");

      // Con 5 dígitos no debe disparar GET /api/crypto-keys/get-my-keys
      await user.type(otpInput, "12345");
      expect(getRequests).toBe(0);
      expect(otpInput).toHaveValue("12345");

      // Al completar el sexto dígito, dispara la consulta y deshabilita el input mientras carga
      await user.type(otpInput, "6");

      await requestStarted;
      expect(otpInput).toBeDisabled();

      await act(async () => {
        releaseResponse();
      });

      await waitFor(() => {
        expect(useCheckLocalCryptoKeys.getState().hasLocalCryptoKeys).toBe(true);
      });

      expect(getRequests).toBe(1);
      expect(useCurrentUser.getState().user?.hasCryptoKeys).toBe(true);
      expect(JSON.parse(localStorage.getItem("publicKey")!)).toEqual(publicKeyJWK);
      expect(JSON.parse(localStorage.getItem("privateKey")!)).toEqual(privateKeyJWK);
    });

    it("cuando la desencriptación falla con PIN incorrecto, limpia el input, muestra toast de error y devuelve el foco al OTPInput", async () => {
      const user = userEvent.setup();

      const { publicKeyJWK, privateKeyJWK } = await getCachedMockKeyPair("primary");
      const { encryptedKey, salt, iv } = await protectPrivateKey(
        privateKeyJWK,
        "123456"
      );

      let markStarted!: () => void;
      const requestStarted = new Promise<void>((resolve) => {
        markStarted = resolve;
      });
      let releaseResponse!: () => void;
      const responseGate = new Promise<void>((resolve) => {
        releaseResponse = resolve;
      });

      server.use(
        http.get("/api/crypto-keys/get-my-keys", async () => {
          markStarted();
          await responseGate;

          return HttpResponse.json({
            publicKey: publicKeyJWK,
            privateKeyLock: {
              key: encryptedKey,
              salt,
              iv
            }
          });
        })
      );

      const toastDismissSpy = vi
        .spyOn(toast, "dismiss")
        .mockImplementation(() => "toast-id");
      const toastErrorSpy = vi
        .spyOn(toast, "error")
        .mockImplementation(() => "toast-id");

      renderScreen("get", ["/"]);

      const otpInput = screen.getByRole("textbox");
      await user.type(otpInput, "999999");

      await requestStarted;

      // Mover el foco explícitamente fuera del input mientras la consulta está en curso
      const forgotLink = screen.getByRole("link", { name: "¿Olvidaste tu pin?" });
      act(() => {
        forgotLink.focus();
      });
      expect(forgotLink).toHaveFocus();
      expect(otpInput).not.toHaveFocus();

      await act(async () => {
        releaseResponse();
      });

      await waitFor(() => {
        expect(toastErrorSpy).toHaveBeenCalledWith("PIN incorrecto.");
      });

      expect(toastDismissSpy).toHaveBeenCalled();
      expect(otpInput).toHaveValue("");
      expect(otpInput).toHaveFocus();
      expect(useCheckLocalCryptoKeys.getState().hasLocalCryptoKeys).toBe(false);
      expect(localStorage.getItem("privateKey")).toBeNull();
      expect(localStorage.getItem("publicKey")).toBeNull();
    });

    it("ante un error HTTP del servidor que no es PIN incorrecto, muestra toast de error sin borrar el PIN ingresado", async () => {
      const user = userEvent.setup();

      server.use(
        http.get("/api/crypto-keys/get-my-keys", () =>
          HttpResponse.json(
            { message: "Servicio temporalmente no disponible" },
            { status: 500 }
          )
        )
      );

      const toastErrorSpy = vi
        .spyOn(toast, "error")
        .mockImplementation(() => "toast-id");

      renderScreen("get", ["/"]);

      const otpInput = screen.getByRole("textbox");
      await user.type(otpInput, "123456");

      await waitFor(() => {
        expect(toastErrorSpy).toHaveBeenCalledWith(
          "Servicio temporalmente no disponible"
        );
      });

      expect(otpInput).toHaveValue("123456");
      expect(otpInput).toHaveFocus();
      expect(useCheckLocalCryptoKeys.getState().hasLocalCryptoKeys).toBe(false);
    });

    it("enlaza a /update-crypto-keys en '¿Olvidaste tu pin?', resetea la query al desmontar y retorna null sin usuario", async () => {
      const user = userEvent.setup();
      const resetQueriesSpy = vi.spyOn(queryClient, "resetQueries");

      const { unmount } = renderScreen("get", ["/"]);

      const forgotLink = screen.getByRole("link", { name: "¿Olvidaste tu pin?" });
      expect(forgotLink).toHaveAttribute("href", "/update-crypto-keys");

      await user.click(forgotLink);

      expect(await screen.findByTestId("update-keys-route")).toBeInTheDocument();
      expect(resetQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["getMyCryptoKeys"]
      });

      unmount();

      // Sin usuario cargado retorna null sin renderizar el formulario
      useCurrentUser.setState({ user: null, loadingUser: false });
      renderScreen("get", ["/"]);
      expect(
        screen.queryByRole("heading", { name: "Introduce tu pin de cifrado" })
      ).not.toBeInTheDocument();
    });
  });
});
