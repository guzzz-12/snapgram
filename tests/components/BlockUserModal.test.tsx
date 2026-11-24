import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import BlockUserModal from "@/components/BlockUserModal";
import { useBlockUserModal } from "@/hooks/useBlockUserModal";
import { server } from "../mocks/server";
import { buildMockUser } from "../mocks/users/factories";

/**
 * Suite de integración para el modal de bloqueo/desbloqueo de usuarios
 * (`src/components/BlockUserModal.tsx`).
 *
 * Propósito:
 *   Validar la renderización condicional del diálogo según el estado global
 *   `useBlockUserModal`, el texto dinámico por operación (`"block"` vs `"unblock"`), la
 *   ejecución de `PUT /api/block`, la limpieza del store y la redirección condicional a `"/"`
 *   cuando el usuario se encuentra en `/profile/:clerkId` del perfil bloqueado.
 *
 * Qué evalúa y alcance (SUTs):
 *   - `BlockUserModal` (`operation: "block"` en `/profile/:clerkId`): muestra título,
 *     descripción y botón `"Confirmar bloqueo"`, ejecuta `PUT /api/block` con
 *     `{ blockedUserId }`, limpia el store y redirige a `"/"`.
 *   - `BlockUserModal` (`operation: "unblock"` fuera de `/profile/:clerkId`): muestra textos
 *     de desbloqueo y botón `"Confirmar desbloqueo"`, ejecuta `PUT /api/block` y conserva la
 *     ruta actual sin redirigir a `"/"`.
 *   - Guardas y cancelación: no abre el diálogo cuando `blockedUser` es `null` y `"Cancelar"`
 *     cierra y limpia el store sin invocar `PUT /api/block`.
 */
describe("BlockUserModal", () => {
  let queryClient: QueryClient;

  const targetUser = buildMockUser({
    _id: "usr_target_1",
    clerkId: "clerk_target_1",
    fullName: "Martín Ríos",
    username: "martin_r"
  });

  const LocationDisplay = () => {
    const location = useLocation();
    return <div data-testid="current-location">{location.pathname}</div>;
  };

  const renderModal = (initialPath: string) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route
              path="*"
              element={
                <>
                  <BlockUserModal />
                  <LocationDisplay />
                </>
              }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    useBlockUserModal.setState({
      open: false,
      blockedUser: null,
      operation: "block"
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    queryClient.clear();
    useBlockUserModal.setState({
      open: false,
      blockedUser: null,
      operation: "block"
    });
  });

  it("muestra textos de bloqueo, ejecuta PUT /api/block y redirige a '/' si está en /profile/:clerkId del usuario bloqueado", async () => {
    const user = userEvent.setup();
    const captured: { blockedUserId: string | null; calls: number } = {
      blockedUserId: null,
      calls: 0
    };

    server.use(
      http.put("/api/block", async ({ request }) => {
        captured.calls += 1;
        const body = (await request.json()) as { blockedUserId: string };
        captured.blockedUserId = body.blockedUserId;
        return HttpResponse.json({
          data: {
            user: targetUser,
            operation: "block" as const,
            chatId: null
          }
        });
      })
    );

    useBlockUserModal.setState({
      open: true,
      blockedUser: targetUser,
      operation: "block"
    });

    renderModal(`/profile/${targetUser.clerkId}`);

    expect(
      screen.getByRole("heading", { name: "¿Bloquear a Martín?" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "No podrás interactuar con Martín ni podrás enviarle mensajes."
      )
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirmar bloqueo" }));

    await waitFor(() => {
      expect(screen.getByTestId("current-location").textContent).toBe("/");
    });

    expect(captured.calls).toBe(1);
    expect(captured.blockedUserId).toBe("usr_target_1");
    expect(useBlockUserModal.getState()).toMatchObject({
      open: false,
      blockedUser: null
    });
  });

  it("muestra textos de desbloqueo, ejecuta PUT /api/block y NO redirige si la ruta no es /profile/:clerkId del usuario", async () => {
    const user = userEvent.setup();
    let blockCalls = 0;

    server.use(
      http.put("/api/block", async ({ request }) => {
        blockCalls += 1;
        const body = (await request.json()) as { blockedUserId: string };
        expect(body.blockedUserId).toBe("usr_target_1");
        return HttpResponse.json({
          data: {
            user: targetUser,
            operation: "unblock" as const,
            chatId: "chat_1"
          }
        });
      })
    );

    useBlockUserModal.setState({
      open: true,
      blockedUser: targetUser,
      operation: "unblock"
    });

    renderModal("/messages/chat_1");

    expect(
      screen.getByRole("heading", { name: "¿Desbloquear a Martín?" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Martín podrá volver interactuar contigo y enviarte mensajes."
      )
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirmar desbloqueo" }));

    await waitFor(() => {
      expect(useBlockUserModal.getState().open).toBe(false);
    });

    expect(blockCalls).toBe(1);
    expect(useBlockUserModal.getState().blockedUser).toBeNull();
    expect(screen.getByTestId("current-location").textContent).toBe("/messages/chat_1");
  });

  it("no abre el diálogo si blockedUser es null y permite cancelar sin invocar PUT /api/block", async () => {
    const user = userEvent.setup();
    let blockCalls = 0;

    server.use(
      http.put("/api/block", () => {
        blockCalls += 1;
        return HttpResponse.json({
          data: { user: targetUser, operation: "block" as const, chatId: null }
        });
      })
    );

    // 1. open=true pero blockedUser=null -> el diálogo permanece cerrado
    useBlockUserModal.setState({
      open: true,
      blockedUser: null,
      operation: "block"
    });
    const first = renderModal("/profile/clerk_target_1");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    first.unmount();

    // 2. Cancelar cierra y limpia blockedUser sin enviar petición
    useBlockUserModal.setState({
      open: true,
      blockedUser: targetUser,
      operation: "block"
    });
    renderModal(`/profile/${targetUser.clerkId}`);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(useBlockUserModal.getState()).toMatchObject({
      open: false,
      blockedUser: null
    });
    expect(blockCalls).toBe(0);
    expect(screen.getByTestId("current-location")).toHaveTextContent(
      `/profile/${targetUser.clerkId}`
    );
  });
});
