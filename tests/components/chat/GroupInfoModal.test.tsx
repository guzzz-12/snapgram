import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mockIntersectionObserver } from "jsdom-testing-mocks";
import { http, HttpResponse } from "msw";
import GroupInfoModal from "@/components/chat/GroupInfoModal";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useLeaveOrKickUser } from "@/hooks/useLeaveOrKickUser";
import { server } from "../../mocks/server";
import { buildMockUser } from "../../mocks/users/factories";
import { buildMockChat } from "../../mocks/chats/factories";

/**
 * Suite de integración para el modal de información y administración de grupo
 * (`src/components/chat/GroupInfoModal.tsx`).
 *
 * Propósito:
 *   Validar la carga de información de un grupo, la diferenciación de permisos entre
 *   administrador y miembro regular, la edición inline del nombre y descripción, el cierre
 *   automático cuando el chat no es grupal, y la delegación hacia los submodales de gestión
 *   (`AddMemberToGroupModal` y `LeaveOrKickFromGroupModal`).
 *
 * Qué evalúa y alcance (SUTs):
 *   - `GroupInfoModal` (admin): muestra controles de edición de foto/nombre/descripción,
 *     `"Eliminar grupo"` y botón `"Expulsar"` solo sobre otros miembros (nunca sobre sí mismo);
 *     edita nombre y descripción enviando `PUT /api/chats/group/:id/update-info` y deshabilita
 *     guardar descripción vacía.
 *   - `GroupInfoModal` (miembro regular): oculta controles administrativos y `"Expulsar"`,
 *     mostrando `"Salir del grupo"` que abre `LeaveOrKickFromGroupModal` en modo `"Abandonar"`.
 *   - `GroupInfoModal` (guardas): retorna `null` sin `groupId` y cierra el modal vía
 *     `setIsOpen(false)` si la respuesta de `GET /api/chats/:groupId` no es de tipo `"group"`.
 */
describe("GroupInfoModal", () => {
  let queryClient: QueryClient;

  const adminUser = buildMockUser({
    _id: "usr_admin_1",
    clerkId: "clerk_admin_1",
    fullName: "Elena Admin",
    username: "elena_admin"
  });

  const memberUser = buildMockUser({
    _id: "usr_member_2",
    clerkId: "clerk_member_2",
    fullName: "Lucas Miembro",
    username: "lucas_m"
  });

  const groupChat = buildMockChat({
    _id: "group_info_1",
    type: "group",
    groupName: "Devs Snapgram",
    groupDescription: "Descripción inicial del grupo",
    groupAdmin: adminUser,
    participants: [adminUser, memberUser]
  });

  const renderModal = (
    props: { groupId: string | undefined; isOpen: boolean; setIsOpen: (v: boolean) => void },
    activeUser = adminUser
  ) => {
    useCurrentUser.setState({ user: activeUser, loadingUser: false });

    return render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <MemoryRouter>
            <GroupInfoModal {...props} />
          </MemoryRouter>
        </TooltipProvider>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    mockIntersectionObserver();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    useLeaveOrKickUser.setState({
      modalState: { isOpen: false, operation: null, kickedUser: undefined }
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    queryClient.clear();
    useCurrentUser.setState({ user: null, loadingUser: false });
    useLeaveOrKickUser.setState({
      modalState: { isOpen: false, operation: null, kickedUser: undefined }
    });
  });

  it("permite al administrador editar nombre y descripción del grupo enviando PUT /api/chats/group/:id/update-info", async () => {
    const user = userEvent.setup();
    const updatePayloads: { groupName: string; groupDescription: string }[] = [];
    let currentGroup = { ...groupChat };

    server.use(
      http.get("/api/chats/:chatId", () => {
        return HttpResponse.json({
          data: currentGroup,
          isBlocked: { blockedBy: null, blockedUser: null }
        });
      }),
      http.put("/api/chats/group/:chatId/update-info", async ({ params, request }) => {
        expect(params.chatId).toBe("group_info_1");
        const body = (await request.json()) as {
          groupName: string;
          groupDescription: string;
        };
        updatePayloads.push(body);
        currentGroup = {
          ...currentGroup,
          groupName: body.groupName,
          groupDescription: body.groupDescription
        };
        return HttpResponse.json({ data: currentGroup });
      })
    );

    renderModal({ groupId: "group_info_1", isOpen: true, setIsOpen: vi.fn() }, adminUser);

    expect(await screen.findByText("Devs Snapgram")).toBeInTheDocument();
    expect(screen.getByText("Descripción inicial del grupo")).toBeInTheDocument();
    expect(screen.getByText("2 Miembros")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();

    // Admin ve "Eliminar grupo" pero NO "Salir del grupo"
    expect(screen.getByRole("button", { name: "Eliminar grupo" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Salir del grupo" })).not.toBeInTheDocument();

    // Botón "Expulsar" solo aparece para Lucas (no para el propio admin)
    const kickButtons = screen.getAllByRole("button", { name: "Expulsar" });
    expect(kickButtons).toHaveLength(1);

    // 1. Editar nombre del grupo
    await user.click(screen.getByRole("button", { name: "Editar nombre del grupo" }));
    const nameInput = screen.getByPlaceholderText("Nombre del grupo");
    await user.clear(nameInput);
    await user.type(nameInput, "Devs Core");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Devs Core")).toBeInTheDocument();
    expect(updatePayloads[0]).toEqual({
      groupName: "Devs Core",
      groupDescription: "Descripción inicial del grupo"
    });

    // 2. Editar descripción del grupo: vacía deshabilita guardar, nueva envía PUT
    await user.click(
      screen.getByRole("button", { name: "Editar descripción del grupo" })
    );
    const descInput = screen.getByLabelText("Editar descripción del grupo");
    await user.clear(descInput);
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();

    await user.type(descInput, "Nueva descripción oficial");
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Nueva descripción oficial")).toBeInTheDocument();
    expect(updatePayloads[1]).toEqual({
      groupName: "Devs Core",
      groupDescription: "Nueva descripción oficial"
    });
  });

  it("oculta controles de administrador a miembros regulares y permite abrir los submodales de expulsar, salir y agregar miembro", async () => {
    const user = userEvent.setup();

    server.use(
      http.get("/api/chats/:chatId", () => {
        return HttpResponse.json({
          data: groupChat,
          isBlocked: { blockedBy: null, blockedUser: null }
        });
      })
    );

    // 1. Vista de miembro regular (no admin)
    const first = renderModal(
      { groupId: "group_info_1", isOpen: true, setIsOpen: vi.fn() },
      memberUser
    );

    expect(await screen.findByText("Devs Snapgram")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Editar nombre del grupo" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Editar descripción del grupo" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Cambiar foto del grupo" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Eliminar grupo" })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Expulsar" })).not.toBeInTheDocument();

    // Miembro regular abre modal de abandonar grupo
    await user.click(screen.getByRole("button", { name: "Salir del grupo" }));
    expect(useLeaveOrKickUser.getState().modalState).toMatchObject({
      isOpen: true,
      operation: "Abandonar"
    });
    expect(
      await screen.findByRole("heading", { name: "Salir de Devs Snapgram" })
    ).toBeInTheDocument();

    first.unmount();
    useLeaveOrKickUser.setState({
      modalState: { isOpen: false, operation: null, kickedUser: undefined }
    });

    // 2. Vista de admin: pulsar "Expulsar" y "Agregar miembro" abre sus submodales
    renderModal(
      { groupId: "group_info_1", isOpen: true, setIsOpen: vi.fn() },
      adminUser
    );

    expect(await screen.findByText("Devs Snapgram")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Expulsar" }));
    expect(useLeaveOrKickUser.getState().modalState).toMatchObject({
      isOpen: true,
      operation: "Eliminar",
      kickedUser: expect.objectContaining({ _id: "usr_member_2" })
    });
    expect(
      await screen.findByRole("heading", { name: "Eliminar a Lucas del grupo" })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    await user.click(screen.getByRole("button", { name: "Agregar miembro" }));

    expect(
      await screen.findByRole("heading", { name: "Agregar miembro a Devs Snapgram" })
    ).toBeInTheDocument();
  });

  it("no renderiza nada sin groupId y cierra el modal automáticamente si el chat recibido no es un grupo", async () => {
    const setIsOpen = vi.fn();

    const emptyRender = renderModal({
      groupId: undefined,
      isOpen: true,
      setIsOpen
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    emptyRender.unmount();

    server.use(
      http.get("/api/chats/:chatId", () => {
        return HttpResponse.json({
          data: buildMockChat({
            _id: "private_chat_1",
            type: "private",
            participants: [adminUser, memberUser]
          }),
          isBlocked: { blockedBy: null, blockedUser: null }
        });
      })
    );

    renderModal({
      groupId: "private_chat_1",
      isOpen: true,
      setIsOpen
    });

    await waitFor(() => {
      expect(setIsOpen).toHaveBeenCalledWith(false);
    });
  });
});
