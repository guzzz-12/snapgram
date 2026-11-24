import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mockIntersectionObserver } from "jsdom-testing-mocks";
import { http, HttpResponse } from "msw";
import CreateGroupChatModal from "@/components/chat/CreateGroupChatModal";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { server } from "../../mocks/server";
import { buildMockUser } from "../../mocks/users/factories";
import { buildMockChat } from "../../mocks/chats/factories";

/**
 * Suite de integración para el modal de creación de chats grupales
 * (`src/components/chat/CreateGroupChatModal.tsx`, `UsersSearchBar.tsx`,
 * `GroupChatModalItem.tsx` y `UsersSearchNoResults.tsx`).
 *
 * Propósito:
 *   Validar las reglas de habilitación del formulario de creación de grupo, el control de
 *   usuarios con/sin llaves criptográficas, la búsqueda de participantes con debounce y el
 *   flujo completo de creación y navegación al nuevo chat grupal.
 *
 * Qué evalúa y alcance (SUTs):
 *   - `CreateGroupChatModal`: botón `"Crear grupo"` deshabilitado hasta ingresar `groupName`
 *     y seleccionar al menos un participante (`selectedUsersIds.length > 0`); envío de
 *     `POST /api/chats/create` con `type: "group"`, `groupName`, `participants` y `groupAdmin`,
 *     seguido de navegación a `/messages/:chatId`.
 *   - `GroupChatModalItem`: renderizado de checkbox únicamente para usuarios con
 *     `hasCryptoKeys === true` y alternancia de selección/deselección.
 *   - `UsersSearchBar` + `useDebounce` + `UsersSearchNoResults`: espera el debounce antes de
 *     consultar `GET /api/users/search` con `keyword` y muestra `"No se encontraron resultados"`
 *     cuando no hay coincidencias.
 */
describe("CreateGroupChatModal", () => {
  let queryClient: QueryClient;

  const currentUser = buildMockUser({
    _id: "usr_creator_1",
    clerkId: "clerk_creator_1",
    fullName: "Ana Creadora",
    username: "ana_c",
    hasCryptoKeys: true
  });

  const userWithKeysA = buildMockUser({
    _id: "usr_cand_a",
    clerkId: "clerk_cand_a",
    fullName: "Carlos Cifrado",
    username: "carlos_c",
    hasCryptoKeys: true
  });

  const userWithKeysB = buildMockUser({
    _id: "usr_cand_b",
    clerkId: "clerk_cand_b",
    fullName: "Sofía Segura",
    username: "sofia_s",
    hasCryptoKeys: true
  });

  const userWithoutKeys = buildMockUser({
    _id: "usr_no_keys",
    clerkId: "clerk_no_keys",
    fullName: "Pedro SinLlaves",
    username: "pedro_nk",
    hasCryptoKeys: false
  });

  const LocationDisplay = () => {
    const location = useLocation();
    return <div data-testid="current-location">{location.pathname}</div>;
  };

  const renderModal = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <MemoryRouter initialEntries={["/messages"]}>
            <Routes>
              <Route
                path="*"
                element={
                  <>
                    <CreateGroupChatModal />
                    <LocationDisplay />
                  </>
                }
              />
            </Routes>
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
    useCurrentUser.setState({ user: currentUser, loadingUser: false });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    queryClient.clear();
    useCurrentUser.setState({ user: null, loadingUser: false });
  });

  it("mantiene 'Crear grupo' deshabilitado hasta ingresar nombre y seleccionar al menos un usuario con llaves criptográficas", async () => {
    const user = userEvent.setup();

    server.use(
      http.get("/api/users/search", () => {
        return HttpResponse.json({
          data: [userWithKeysA, userWithoutKeys],
          hasMore: false,
          nextPage: null
        });
      })
    );

    renderModal();

    await user.click(screen.getByRole("button", { name: "Crear grupo" }));

    const dialog = await screen.findByRole("dialog");
    const submitBtn = within(dialog).getByRole("button", { name: "Crear grupo" });
    const nameInput = within(dialog).getByLabelText("Nombre del grupo");

    // Estado inicial: sin nombre ni participantes -> deshabilitado
    expect(submitBtn).toBeDisabled();

    // Esperar a que carguen los usuarios
    expect(await within(dialog).findByText("Carlos Cifrado")).toBeInTheDocument();
    expect(within(dialog).getByText("Pedro SinLlaves")).toBeInTheDocument();

    // El usuario sin llaves criptográficas NO debe tener checkbox seleccionable
    const pedroItem = within(dialog).getByText("Pedro SinLlaves").closest("li")!;
    expect(within(pedroItem).queryByRole("checkbox")).not.toBeInTheDocument();

    // Solo nombre sin participantes -> sigue deshabilitado
    await user.type(nameInput, "Equipo Frontend");
    expect(submitBtn).toBeDisabled();

    // Seleccionar a Carlos habilita el botón
    const carlosItem = within(dialog).getByText("Carlos Cifrado").closest("li")!;
    const carlosCheckbox = within(carlosItem).getByRole("checkbox");
    await user.click(carlosCheckbox);
    expect(submitBtn).toBeEnabled();

    // Quitar nombre aunque haya participante -> vuelve a deshabilitarse
    await user.clear(nameInput);
    expect(submitBtn).toBeDisabled();

    // Volver a escribir nombre y deseleccionar a Carlos -> vuelve a deshabilitarse
    await user.type(nameInput, "Equipo Frontend");
    expect(submitBtn).toBeEnabled();
    await user.click(carlosCheckbox);
    expect(submitBtn).toBeDisabled();
  });

  it("espera el debounce de UsersSearchBar antes de consultar /api/users/search y muestra UsersSearchNoResults sin coincidencias", async () => {
    const user = userEvent.setup();
    const requestedKeywords: string[] = [];

    server.use(
      http.get("/api/users/search", ({ request }) => {
        const keyword = new URL(request.url).searchParams.get("keyword") ?? "";
        requestedKeywords.push(keyword);

        if (keyword === "sofia") {
          return HttpResponse.json({
            data: [userWithKeysB],
            hasMore: false,
            nextPage: null
          });
        }

        if (keyword === "inexistente") {
          return HttpResponse.json({
            data: [],
            hasMore: false,
            nextPage: null
          });
        }

        return HttpResponse.json({
          data: [userWithKeysA, userWithKeysB],
          hasMore: false,
          nextPage: null
        });
      })
    );

    renderModal();
    await user.click(screen.getByRole("button", { name: "Crear grupo" }));

    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("Carlos Cifrado")).toBeInTheDocument();
    expect(requestedKeywords).toEqual([""]);

    const searchInput = within(dialog).getByPlaceholderText(
      "Busca por nombre o usuario..."
    );

    // Escribir término sin resultados: no debe disparar petición antes del debounce (500ms)
    await user.type(searchInput, "inexistente");
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(requestedKeywords).toEqual([""]);

    // Tras cumplirse el debounce consulta una sola vez con "inexistente" y muestra UsersSearchNoResults
    expect(
      await within(dialog).findByText("No se encontraron resultados")
    ).toBeInTheDocument();
    expect(requestedKeywords).toEqual(["", "inexistente"]);

    // Buscar término existente y comprobar filtrado
    await user.clear(searchInput);
    await user.type(searchInput, "sofia");

    expect(await within(dialog).findByText("Sofía Segura")).toBeInTheDocument();
    expect(within(dialog).queryByText("Carlos Cifrado")).not.toBeInTheDocument();
    expect(requestedKeywords).toEqual(["", "inexistente", "sofia"]);
  });

  it("crea el grupo enviando POST /api/chats/create con los datos seleccionados y navega al nuevo chat", async () => {
    const user = userEvent.setup();
    const capturedPayload: {
      body: {
        type: string;
        groupName: string;
        participants: string[];
        groupAdmin: string;
      } | null;
    } = { body: null };

    server.use(
      http.get("/api/users/search", () => {
        return HttpResponse.json({
          data: [userWithKeysA, userWithKeysB],
          hasMore: false,
          nextPage: null
        });
      }),
      http.post("/api/chats/create", async ({ request }) => {
        capturedPayload.body = (await request.json()) as typeof capturedPayload.body;
        return HttpResponse.json({
          data: buildMockChat({
            _id: "chat_new_group_99",
            type: "group",
            groupName: capturedPayload.body?.groupName ?? ""
          })
        });
      })
    );

    renderModal();
    await user.click(screen.getByRole("button", { name: "Crear grupo" }));

    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("Carlos Cifrado")).toBeInTheDocument();

    await user.type(
      within(dialog).getByLabelText("Nombre del grupo"),
      "Proyecto Snapgram"
    );

    const carlosItem = within(dialog).getByText("Carlos Cifrado").closest("li")!;
    const sofiaItem = within(dialog).getByText("Sofía Segura").closest("li")!;
    await user.click(within(carlosItem).getByRole("checkbox"));
    await user.click(within(sofiaItem).getByRole("checkbox"));

    await user.click(within(dialog).getByRole("button", { name: "Crear grupo" }));

    await waitFor(() => {
      expect(screen.getByTestId("current-location")).toHaveTextContent(
        "/messages/chat_new_group_99"
      );
    });

    expect(capturedPayload.body).toEqual({
      type: "group",
      groupName: "Proyecto Snapgram",
      participants: ["usr_cand_a", "usr_cand_b"],
      groupAdmin: "usr_creator_1"
    });
  });
});
