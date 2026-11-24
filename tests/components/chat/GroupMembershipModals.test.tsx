import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mockIntersectionObserver } from "jsdom-testing-mocks";
import { http, HttpResponse } from "msw";
import AddMemberToGroupModal from "@/components/chat/AddMemberToGroupModal";
import LeaveOrKickFromGroupModal from "@/components/chat/LeaveOrKickFromGroupModal";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useLeaveOrKickUser } from "@/hooks/useLeaveOrKickUser";
import { server } from "../../mocks/server";
import { buildMockUser } from "../../mocks/users/factories";
import { buildMockChat } from "../../mocks/chats/factories";

/**
 * Suite de integración para los modales de membresía grupal
 * (`src/components/chat/AddMemberToGroupModal.tsx` y
 * `src/components/chat/LeaveOrKickFromGroupModal.tsx`).
 *
 * Propósito:
 *   Validar la incorporación de nuevos participantes a un grupo existente (con búsqueda
 *   debounced e identificación de miembros actuales) y las operaciones de expulsión y abandono
 *   de grupo coordinadas mediante el store global `useLeaveOrKickUser`.
 *
 * Qué evalúa y alcance (SUTs):
 *   - `AddMemberToGroupModal`: búsqueda con debounce sobre `/api/users/search` y estado vacío
 *     `"No se encontraron resultados"`, etiquetado `"Ya es miembro"` sin radio seleccionable
 *     para participantes existentes, habilitación condicional del botón `"Agregar"` y envío
 *     de `PUT /api/chats/group/:id/add-members` con cierre del modal en `onSuccess`.
 *   - `LeaveOrKickFromGroupModal` (`operation: "Eliminar"`): texto dinámico con el nombre del
 *     usuario, envío de `PUT /api/chats/group/:id/kick` con `{ participantId }` y limpieza del
 *     store `useLeaveOrKickUser`.
 *   - `LeaveOrKickFromGroupModal` (`operation: "Abandonar"`): cancelación sin mutar, envío de
 *     `PUT /api/chats/group/:id/leave`, cierre del store y redirección a `/messages?type=all`.
 */
describe("AddMemberToGroupModal y LeaveOrKickFromGroupModal", () => {
  let queryClient: QueryClient;

  const adminUser = buildMockUser({
    _id: "usr_grp_admin",
    clerkId: "clerk_grp_admin",
    fullName: "Elena Admin",
    username: "elena_admin"
  });

  const existingMember = buildMockUser({
    _id: "usr_grp_member",
    clerkId: "clerk_grp_member",
    fullName: "Lucas Miembro",
    username: "lucas_m"
  });

  const candidateUser = buildMockUser({
    _id: "usr_grp_new",
    clerkId: "clerk_grp_new",
    fullName: "Valeria Nueva",
    username: "valeria_n"
  });

  const groupChat = buildMockChat({
    _id: "group_mem_1",
    type: "group",
    groupName: "Club Lectura",
    groupAdmin: adminUser,
    participants: [adminUser, existingMember]
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

  const renderWithRouter = (ui: React.ReactElement, activeUser = adminUser) => {
    useCurrentUser.setState({ user: activeUser, loadingUser: false });

    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/messages/group_mem_1"]}>
          <Routes>
            <Route
              path="*"
              element={
                <>
                  {ui}
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

  describe("AddMemberToGroupModal", () => {
    it("marca a los participantes actuales como 'Ya es miembro', busca con debounce y agrega al usuario seleccionado", async () => {
      const user = userEvent.setup();
      const setIsOpen = vi.fn();
      const requestedKeywords: string[] = [];
      const addPayload: { newMember: string | null } = { newMember: null };

      server.use(
        http.get("/api/users/search", ({ request }) => {
          const keyword = new URL(request.url).searchParams.get("keyword") ?? "";
          requestedKeywords.push(keyword);

          if (keyword === "nadie") {
            return HttpResponse.json({
              data: [],
              hasMore: false,
              nextPage: null
            });
          }

          return HttpResponse.json({
            data: [existingMember, candidateUser],
            hasMore: false,
            nextPage: null
          });
        }),
        http.put("/api/chats/group/:chatId/add-members", async ({ params, request }) => {
          expect(params.chatId).toBe("group_mem_1");
          const body = (await request.json()) as { newMember: string | null };
          addPayload.newMember = body.newMember;
          return HttpResponse.json({ data: groupChat });
        })
      );

      renderWithRouter(
        <AddMemberToGroupModal
          isOpen={true}
          chatData={groupChat}
          setIsOpen={setIsOpen}
        />
      );

      expect(
        screen.getByRole("heading", { name: "Agregar miembro a Club Lectura" })
      ).toBeInTheDocument();

      // Botón "Agregar" deshabilitado sin usuario seleccionado
      const addBtn = screen.getByRole("button", { name: "Agregar" });
      expect(addBtn).toBeDisabled();

      expect(await screen.findByText("Lucas Miembro")).toBeInTheDocument();
      expect(screen.getByText("Valeria Nueva")).toBeInTheDocument();

      // Lucas ya es miembro -> muestra insignia y NO tiene radio
      const lucasItem = screen.getByText("Lucas Miembro").closest("li")!;
      expect(within(lucasItem).getByText("Ya es miembro")).toBeInTheDocument();
      expect(within(lucasItem).queryByRole("radio")).not.toBeInTheDocument();

      // Búsqueda con debounce sin resultados
      const searchInput = screen.getByPlaceholderText("Busca por nombre o usuario...");
      await user.type(searchInput, "nadie");
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(requestedKeywords).toEqual([""]);

      expect(
        await screen.findByText("No se encontraron resultados")
      ).toBeInTheDocument();
      expect(requestedKeywords).toEqual(["", "nadie"]);

      // Limpiar búsqueda, seleccionar a Valeria y agregar
      await user.clear(searchInput);
      const valeriaText = await screen.findByText("Valeria Nueva");
      const valeriaItem = valeriaText.closest("li")!;
      await user.click(within(valeriaItem).getByRole("radio"));

      expect(addBtn).toBeEnabled();
      await user.click(addBtn);

      await waitFor(() => {
        expect(setIsOpen).toHaveBeenCalledWith(false);
      });
      expect(addPayload.newMember).toBe("usr_grp_new");
    });
  });

  describe("LeaveOrKickFromGroupModal", () => {
    it("expulsa al participante seleccionado enviando PUT /api/chats/group/:id/kick y cierra el modal en el store", async () => {
      const user = userEvent.setup();
      const kickedPayload: { participantId: string | null } = { participantId: null };

      server.use(
        http.put("/api/chats/group/:chatId/kick", async ({ params, request }) => {
          expect(params.chatId).toBe("group_mem_1");
          const body = (await request.json()) as { participantId: string };
          kickedPayload.participantId = body.participantId;
          return HttpResponse.json({ data: groupChat });
        })
      );

      useLeaveOrKickUser.setState({
        modalState: {
          isOpen: true,
          operation: "Eliminar",
          kickedUser: existingMember
        }
      });

      renderWithRouter(<LeaveOrKickFromGroupModal chatData={groupChat} />, adminUser);

      expect(
        screen.getByRole("heading", { name: "Eliminar a Lucas del grupo" })
      ).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Eliminar" }));

      await waitFor(() => {
        expect(useLeaveOrKickUser.getState().modalState).toEqual({
          isOpen: false,
          operation: null,
          kickedUser: undefined
        });
      });

      expect(kickedPayload.participantId).toBe("usr_grp_member");
    });

    it("permite cancelar sin mutar y abandonar el grupo enviando PUT /api/chats/group/:id/leave con redirección a /messages?type=all", async () => {
      const user = userEvent.setup();
      let leaveCalls = 0;

      server.use(
        http.put("/api/chats/group/:chatId/leave", ({ params }) => {
          expect(params.chatId).toBe("group_mem_1");
          leaveCalls += 1;
          return HttpResponse.json({ data: groupChat });
        })
      );

      useLeaveOrKickUser.setState({
        modalState: {
          isOpen: true,
          operation: "Abandonar"
        }
      });

      renderWithRouter(<LeaveOrKickFromGroupModal chatData={groupChat} />, existingMember);

      expect(
        screen.getByRole("heading", { name: "Salir de Club Lectura" })
      ).toBeInTheDocument();

      // Cancelar cierra el modal sin disparar petición
      await user.click(screen.getByRole("button", { name: "Cancelar" }));
      expect(useLeaveOrKickUser.getState().modalState.isOpen).toBe(false);
      expect(leaveCalls).toBe(0);

      // Reabrir y confirmar abandono
      act(() => {
        useLeaveOrKickUser.setState({
          modalState: {
            isOpen: true,
            operation: "Abandonar"
          }
        });
      });

      await user.click(await screen.findByRole("button", { name: "Salir" }));

      await waitFor(() => {
        expect(screen.getByTestId("current-location")).toHaveTextContent(
          "/messages?type=all"
        );
      });
      expect(leaveCalls).toBe(1);
      expect(useLeaveOrKickUser.getState().modalState.isOpen).toBe(false);
    });
  });
});
