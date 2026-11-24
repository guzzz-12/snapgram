import { useState } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent, { PointerEventsCheckLevel } from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mockIntersectionObserver } from "jsdom-testing-mocks";
import { http, HttpResponse } from "msw";
import CreatePostInput from "@/components/posts/CreatePostInput";
import CreatePostModal from "@/components/posts/CreatePostModal";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCreatePublicationModal } from "@/hooks/useCreatePublicationModal";
import { server } from "../../mocks/server";
import { buildMockUser } from "../../mocks/users/factories";

/**
 * Suite de integración para el autocompletado de hashtags y posicionamiento del popover
 * (`src/components/posts/CreatePostInput.tsx`, `HashtagsPopover.tsx` y `CreatePostModal.tsx`).
 *
 * Propósito:
 *   Validar el flujo completo de autocompletado de hashtags desde el textarea: búsqueda con
 *   debounce, resaltado y conteo de publicaciones, creación inline cuando no hay coincidencia
 *   exacta, recuperación ante error con reintento, posicionamiento portal con clamping/flip en
 *   viewport, navegación por teclado y convivencia sin cierres accidentales con `CreatePostModal`.
 *
 * Qué evalúa y alcance (SUTs):
 *   - `CreatePostInput` + `HashtagsPopover`: debounce de `250ms` antes de consultar
 *     `GET /api/hashtags?title=...`, resaltado de coincidencia (`<strong>`), formato singular y
 *     plural del conteo, opción condicional `"Crear hashtag <valor>"` (`!hasExactMatch`), y
 *     clamping horizontal + flip vertical (`translateY(-100%)`) en portal `document.body`.
 *   - Manejo de error y creación (`useGetHashtags`, `useCreateHashtag`): fila reintentable
 *     `"Error al cargar hashtags"` / `"Reintentar"` (`refetch()`), y creación vía
 *     `POST /api/hashtags` con inserción automática en el textarea.
 *   - Teclado y cierre contextual: `ArrowDown` + `Enter`, `Tab` (mapeado a `Enter`),
 *     preservación del texto posterior sin espacio duplicado, y cierre ante espacio, borrado
 *     de `#`, navegación fuera del token (`ArrowLeft`) y `pointerdown` externo.
 *   - `CreatePostModal`: `Escape` cierra solo el popover sin cerrar el `Dialog`, y hacer clic
 *     en el portal `[data-hashtags-popover]` tampoco dispara el cierre del modal.
 */
describe("Autocompletado de Hashtags (CreatePostInput, HashtagsPopover y CreatePostModal)", () => {
  let queryClient: QueryClient;

  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  const currentUser = buildMockUser({
    _id: "usr_hash_1",
    clerkId: "clerk_hash_1",
    fullName: "Elena Hashtag",
    username: "elena_h"
  });

  const ControlledInputHarness = ({ initialText = "" }: { initialText?: string }) => {
    const [textContent, setTextContent] = useState(initialText);
    return (
      <div>
        <button type="button">Zona externa</button>
        <CreatePostInput
          textContent={textContent}
          isPending={false}
          setTextContent={setTextContent}
        />
        <output data-testid="controlled-value">{textContent}</output>
      </div>
    );
  };

  const renderInput = (initialText = "") => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ControlledInputHarness initialText={initialText} />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    mockIntersectionObserver();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, retryDelay: 0 },
        mutations: { retry: false, retryDelay: 0 }
      }
    });
    useCurrentUser.setState({ user: currentUser, loadingUser: false });
    useCreatePublicationModal.setState({
      open: false,
      publicationType: null,
      isRepost: false,
      repostedPostId: null
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    queryClient.clear();
    Object.defineProperty(window, "innerWidth", {
      value: originalInnerWidth,
      configurable: true
    });
    Object.defineProperty(window, "innerHeight", {
      value: originalInnerHeight,
      configurable: true
    });
    useCurrentUser.setState({ user: null, loadingUser: false });
    useCreatePublicationModal.setState({
      open: false,
      publicationType: null,
      isRepost: false,
      repostedPostId: null
    });
  });

  it("espera el debounce de 250ms para consultar GET /api/hashtags?title=..., resalta coincidencias, formatea conteos, muestra 'Crear hashtag' solo sin coincidencia exacta y ajusta posición al viewport", async () => {
    const user = userEvent.setup();
    const requestedTitles: string[] = [];

    Object.defineProperty(window, "innerWidth", { value: 400, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 450, configurable: true });

    server.use(
      http.get("/api/hashtags", ({ request }) => {
        const title = new URL(request.url).searchParams.get("title") ?? "";
        requestedTitles.push(title);

        if (title === "#exacto") {
          return HttpResponse.json({
            data: [{ _id: "h_ex", title: "#EXACTO", postsCount: 1 }],
            hasMore: false,
            nextPage: null
          });
        }

        return HttpResponse.json({
          data: [
            { _id: "h_1", title: "#react", postsCount: 1 },
            { _id: "h_2", title: "#reactjs", postsCount: 25 }
          ],
          hasMore: false,
          nextPage: null
        });
      })
    );

    renderInput();

    const textarea = screen.getByTestId("create-post-input") as HTMLTextAreaElement;
    // Simular textarea cerca del borde inferior derecho para probar clamping horizontal y flip vertical
    vi.spyOn(textarea, "getBoundingClientRect").mockReturnValue({
      top: 380,
      left: 350,
      right: 550,
      bottom: 430,
      width: 200,
      height: 50,
      x: 350,
      y: 380,
      toJSON: () => ({})
    });

    await user.type(textarea, "Hola #rea");

    // El popover aparece montado en portal en document.body inmediatamente (en estado debounce/spinner)
    const listbox = screen.getByRole("listbox", { name: "Sugerencias de hashtags" });
    expect(listbox.parentElement).toBe(document.body);
    expect(listbox).toHaveAttribute("data-hashtags-popover");

    // mousedown sobre el popover previene el default para no quitar el foco al textarea
    const mouseDownEvent = new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true
    });
    listbox.dispatchEvent(mouseDownEvent);
    expect(mouseDownEvent.defaultPrevented).toBe(true);

    // Clamping horizontal: Math.min(Math.max(350 - 16, 12), 400 - 320 - 12 = 68) -> 68px
    expect(listbox.style.left).toBe("68px");
    // Flip vertical hacia arriba porque spaceBelow = 450 - (380 + 24) = 46 < 320 y top (380) > 46
    expect(listbox.style.transform).toBe("translateY(-100%)");

    // Antes de 250ms no debe haber enviado todavía la petición
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(requestedTitles).toEqual([]);

    // Tras el debounce consulta con title="#rea", resalta "rea" y formatea singular/plural
    expect(await within(listbox).findByText("1 publicación")).toBeInTheDocument();
    expect(within(listbox).getByText("25 publicaciones")).toBeInTheDocument();
    expect(requestedTitles).toEqual(["#rea"]);

    const highlighted = listbox.querySelectorAll("strong");
    expect(highlighted.length).toBeGreaterThanOrEqual(2);
    expect(highlighted[0].textContent?.toLowerCase()).toBe("#rea");

    // Como no existe coincidencia exacta para "#rea", ofrece "Crear hashtag #rea"
    expect(within(listbox).getByText(/Crear hashtag/i)).toBeInTheDocument();

    // Si existe coincidencia exacta (insensible a mayúsculas), NO muestra "Crear hashtag"
    await user.clear(textarea);
    await user.type(textarea, "#exacto");

    const updatedListbox = screen.getByRole("listbox", {
      name: "Sugerencias de hashtags"
    });
    expect(await within(updatedListbox).findByText("#EXACTO")).toBeInTheDocument();
    expect(within(updatedListbox).queryByText(/Crear hashtag/i)).not.toBeInTheDocument();
  });

  it("permite reintentar tras error en GET /api/hashtags y crear un nuevo hashtag con POST /api/hashtags insertándolo en el textarea", async () => {
    const user = userEvent.setup();
    let getAttempts = 0;
    const createdTitles: string[] = [];

    server.use(
      http.get("/api/hashtags", () => {
        getAttempts += 1;
        // useGetHashtags tiene retry: 2 -> fallan los 3 primeros intentos (1 inicial + 2 reintentos)
        if (getAttempts <= 3) {
          return HttpResponse.json(
            { message: "Fallo temporal de hashtags" },
            { status: 500 }
          );
        }

        return HttpResponse.json({
          data: [{ _id: "h_partial", title: "#nuevomundo", postsCount: 3 }],
          hasMore: false,
          nextPage: null
        });
      }),
      http.post("/api/hashtags", async ({ request }) => {
        const body = (await request.json()) as { title: string };
        createdTitles.push(body.title);
        return HttpResponse.json({
          data: { _id: "h_new", title: body.title, postsCount: 0 }
        });
      })
    );

    renderInput();
    const textarea = screen.getByTestId("create-post-input") as HTMLTextAreaElement;

    await user.type(textarea, "Hola #nuevo");

    const listbox = screen.getByRole("listbox", { name: "Sugerencias de hashtags" });
    expect(
      await within(listbox).findByText("Error al cargar hashtags")
    ).toBeInTheDocument();

    // Pulsar Reintentar dispara refetch y carga sugerencias + opción "Crear hashtag #nuevo"
    await user.click(within(listbox).getByText("Reintentar"));

    expect(await within(listbox).findByText("3 publicaciones")).toBeInTheDocument();
    const createOption = within(listbox).getByText(/Crear hashtag/i);

    await user.click(createOption);

    await waitFor(() => {
      expect(textarea.value).toBe("Hola #nuevo ");
    });
    expect(createdTitles).toEqual(["#nuevo"]);
    expect(
      screen.queryByRole("listbox", { name: "Sugerencias de hashtags" })
    ).not.toBeInTheDocument();
  });

  it("selecciona sugerencias con teclado (ArrowDown + Enter y Tab) preservando texto posterior, y cierra ante espacio, borrado de '#', ArrowLeft o pointerdown externo", async () => {
    const user = userEvent.setup();

    server.use(
      http.get("/api/hashtags", () => {
        return HttpResponse.json({
          data: [
            { _id: "h_1", title: "#react", postsCount: 10 },
            { _id: "h_2", title: "#redux", postsCount: 4 }
          ],
          hasMore: false,
          nextPage: null
        });
      })
    );

    renderInput();
    const textarea = screen.getByTestId("create-post-input") as HTMLTextAreaElement;

    // 1. Insertar texto con sufijo y posicionar el cursor al final de "#re" ("Antes #re despues")
    fireEvent.change(textarea, {
      target: { value: "Antes #re despues", selectionStart: 9, selectionEnd: 9 }
    });
    textarea.setSelectionRange(9, 9);

    const listbox = screen.getByRole("listbox", { name: "Sugerencias de hashtags" });
    expect(await within(listbox).findByText("4 publicaciones")).toBeInTheDocument();

    // Navegar con ArrowDown al segundo ítem (#redux) y seleccionar con Enter
    fireEvent.keyDown(textarea, { key: "ArrowDown" });
    fireEvent.keyDown(textarea, { key: "Enter" });

    // No debe duplicar el espacio antes de "despues"
    expect(textarea.value).toBe("Antes #redux despues");
    expect(
      screen.queryByRole("listbox", { name: "Sugerencias de hashtags" })
    ).not.toBeInTheDocument();

    // 2. Selección con Tab (mapeado a Enter sobre cmdk) elige el primer ítem (#react)
    await user.clear(textarea);
    await user.type(textarea, "#re");

    const listbox2 = screen.getByRole("listbox", { name: "Sugerencias de hashtags" });
    expect(await within(listbox2).findByText("10 publicaciones")).toBeInTheDocument();

    fireEvent.keyDown(textarea, { key: "Tab" });
    expect(textarea.value).toBe("#react ");
    expect(
      screen.queryByRole("listbox", { name: "Sugerencias de hashtags" })
    ).not.toBeInTheDocument();

    // 3. Cierre al escribir espacio
    await user.type(textarea, "#re");
    expect(
      screen.getByRole("listbox", { name: "Sugerencias de hashtags" })
    ).toBeInTheDocument();
    await user.type(textarea, " ");
    expect(
      screen.queryByRole("listbox", { name: "Sugerencias de hashtags" })
    ).not.toBeInTheDocument();

    // 4. Cierre al borrar el símbolo '#'
    await user.clear(textarea);
    await user.type(textarea, "#a");
    expect(
      screen.getByRole("listbox", { name: "Sugerencias de hashtags" })
    ).toBeInTheDocument();
    await user.keyboard("{Backspace}{Backspace}");
    expect(
      screen.queryByRole("listbox", { name: "Sugerencias de hashtags" })
    ).not.toBeInTheDocument();

    // 5. Cierre al mover el cursor fuera del hashtag con ArrowLeft (onKeyUp)
    await user.type(textarea, "hola #re");
    expect(
      screen.getByRole("listbox", { name: "Sugerencias de hashtags" })
    ).toBeInTheDocument();
    textarea.setSelectionRange(2, 2);
    fireEvent.keyUp(textarea, { key: "ArrowLeft" });
    expect(
      screen.queryByRole("listbox", { name: "Sugerencias de hashtags" })
    ).not.toBeInTheDocument();

    // 6. Cierre al hacer pointerdown fuera del textarea y del popover
    textarea.setSelectionRange(8, 8);
    fireEvent.click(textarea);
    expect(
      screen.getByRole("listbox", { name: "Sugerencias de hashtags" })
    ).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByRole("button", { name: "Zona externa" }));
    expect(
      screen.queryByRole("listbox", { name: "Sugerencias de hashtags" })
    ).not.toBeInTheDocument();
  });

  it("dentro de CreatePostModal, Escape cierra solo el popover y hacer clic en el portal de hashtags no cierra el Dialog", async () => {
    const user = userEvent.setup({
      pointerEventsCheck: PointerEventsCheckLevel.Never
    });

    server.use(
      http.get("/api/hashtags", () => {
        return HttpResponse.json({
          data: [{ _id: "h_mod_1", title: "#snapgram", postsCount: 7 }],
          hasMore: false,
          nextPage: null
        });
      })
    );

    useCreatePublicationModal.setState({
      open: true,
      publicationType: "post",
      isRepost: false,
      repostedPostId: null
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CreatePostModal />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const textarea = screen.getByTestId("create-post-input") as HTMLTextAreaElement;
    await user.type(textarea, "Hola #snap");

    const listbox = screen.getByRole("listbox", { name: "Sugerencias de hashtags" });
    expect(await within(listbox).findByText("7 publicaciones")).toBeInTheDocument();

    // 1. Escape cierra únicamente HashtagsPopover y mantiene abierto CreatePostModal
    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("listbox", { name: "Sugerencias de hashtags" })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(useCreatePublicationModal.getState().open).toBe(true);

    // 2. Reabrir el popover y hacer clic en un ítem del portal -> reemplaza texto sin cerrar el Dialog
    await user.type(textarea, "g");
    const listbox2 = screen.getByRole("listbox", { name: "Sugerencias de hashtags" });
    const suggestion = await within(listbox2).findByText("7 publicaciones");

    await user.click(suggestion);

    expect(textarea.value).toBe("Hola #snapgram ");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(useCreatePublicationModal.getState().open).toBe(true);

    // 3. Con el popover ya cerrado, presionar Escape sí cierra CreatePostModal normalmente
    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(useCreatePublicationModal.getState().open).toBe(false);
    });
  });
});
