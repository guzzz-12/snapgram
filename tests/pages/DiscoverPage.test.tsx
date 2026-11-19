import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, type InitialEntry } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ImageKitProvider } from "@imagekit/react";
import { mockIntersectionObserver } from "jsdom-testing-mocks";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import DiscoverPage from "@/pages/DiscoverPage";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthContext, type AuthContext as AuthContextType } from "@/providers/AuthProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useSearchStatus } from "@/hooks/useSearchStatus";
import { server } from "../mocks/server";
import { buildMockUser } from "../mocks/users/factories";
import { buildMockPostWithLikes } from "../mocks/posts/factories";

// `react-responsive-masonry` falla en su build CJS bajo Node/Vitest (propiedad solo lectura).
// Se sustituye por un contenedor simple porque el layout masonry no forma parte del SUT.
vi.mock("react-responsive-masonry", () => ({
  default: ({ children }: { children: ReactNode }) => (
    <div data-testid="masonry">{children}</div>
  )
}));

/**
 * Suite de integración para la página de descubrimiento y búsqueda (`src/pages/DiscoverPage.tsx`).
 *
 * Propósito:
 *   Validar el flujo completo de búsqueda de personas y publicaciones controlado por query params
 *   (`?searchTerm=...&type=people|posts`), la visibilidad del estado inicial (`Placeholder`),
 *   los skeletons de carga, la paginación infinita, los estados vacíos (`NoResults`), el cambio
 *   de filtros en `FiltersBar` y la navegación con debounce desde `SearchBar`.
 *
 * Qué evalúa y alcance (SUT):
 *   - Estado inicial sin búsqueda (`/discover`): muestra `<Placeholder />`, evita disparar
 *     consultas HTTP y bloquea los clics en `FiltersBar` cuando no hay `searchTerm`.
 *   - Búsqueda de personas (`?searchTerm=ana&type=people`): muestra `SearchUserCardSkeleton`
 *     mientras carga, renderiza `ResultUserCard` con los parámetros exactos (`keyword`, `page`,
 *     `limit=10`), no consulta posts y pagina a `page=2` vía `IntersectionObserver`.
 *   - Búsqueda de publicaciones (`?searchTerm=react&type=posts`): muestra `PostCardSkeleton`
 *     mientras carga, renderiza el contador `totalResults`, la lista de `PostCard`, el pie
 *     `"Fin de los resultados"` y no consulta usuarios.
 *   - Sin resultados (`NoResults`): muestra el mensaje correspondiente para personas o
 *     publicaciones y el botón `"Intentar otra búsqueda"` limpia el input y vuelve a `/discover`.
 *   - Alternancia de filtros en `FiltersBar`: cambia entre `"Personas"` y `"Publicaciones"`
 *     conservando `searchTerm` y alternando resultados y endpoints.
 *   - Entrada interactiva desde `SearchBar`: escribe en el buscador, aplica debounce y navega
 *     por defecto a `type=people`.
 */
describe("DiscoverPage", () => {
  let queryClient: QueryClient;
  let io: ReturnType<typeof mockIntersectionObserver>;

  const renderDiscoverPage = (initialEntries: InitialEntry[] = ["/discover"]) => {
    const authValue: AuthContextType = {
      userId: "clerk_discover_user",
      isLoaded: true,
      isSignedIn: true,
      signOut: vi.fn().mockResolvedValue(undefined) as unknown as AuthContextType["signOut"],
      getToken: vi.fn().mockResolvedValue("jwt-mock") as unknown as AuthContextType["getToken"]
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <ImageKitProvider urlEndpoint="https://ik.imagekit.io/y1lpjbueh/">
            <TooltipProvider>
              <MemoryRouter initialEntries={initialEntries}>
                <Routes>
                  <Route path="/discover" element={<DiscoverPage />} />
                </Routes>
              </MemoryRouter>
            </TooltipProvider>
          </ImageKitProvider>
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  };

  const resetStores = () => {
    useCurrentUser.setState({
      user: buildMockUser({ _id: "usr_me", clerkId: "clerk_discover_user" }),
      loadingUser: false
    });
    useSearchStatus.setState({
      searchType: null,
      isSearching: false
    });
  };

  beforeEach(() => {
    io = mockIntersectionObserver();
    window.scrollTo = vi.fn();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, retryDelay: 0 },
        mutations: { retry: false }
      }
    });
    resetStores();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    queryClient.clear();
    useCurrentUser.setState({ user: null, loadingUser: false });
    useSearchStatus.setState({ searchType: null, isSearching: false });
  });

  it("muestra Placeholder en el estado inicial sin searchTerm y no dispara peticiones de búsqueda ni navega desde FiltersBar", async () => {
    const user = userEvent.setup();
    let usersRequests = 0;
    let postsRequests = 0;

    server.use(
      http.get("/api/search/search-users", () => {
        usersRequests += 1;
        return HttpResponse.json({ data: [], hasMore: false, nextPage: null });
      }),
      http.get("/api/search/search-posts", () => {
        postsRequests += 1;
        return HttpResponse.json({
          data: [],
          hasMore: false,
          nextPage: null,
          totalResults: 0
        });
      })
    );

    renderDiscoverPage(["/discover"]);

    expect(screen.getByRole("heading", { level: 1, name: "Descubre" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Explora y descubre" })
    ).toBeInTheDocument();
    expect(screen.queryByText(/No se encontraron/i)).not.toBeInTheDocument();

    // Intentar hacer clic en los filtros sin searchTerm no debe disparar búsquedas
    await user.click(screen.getByRole("link", { name: "Personas" }));
    await user.click(screen.getByRole("link", { name: "Publicaciones" }));

    expect(
      screen.getByRole("heading", { level: 2, name: "Explora y descubre" })
    ).toBeInTheDocument();
    expect(usersRequests).toBe(0);
    expect(postsRequests).toBe(0);
  });

  it("busca personas (?searchTerm=ana&type=people), muestra skeletons mientras carga, renderiza ResultUserCard y pagina con IntersectionObserver", async () => {
    let releasePage1!: () => void;
    const page1Gate = new Promise<void>((resolve) => {
      releasePage1 = resolve;
    });

    const requestedParams: Array<{
      keyword: string | null;
      page: string | null;
      limit: string | null;
    }> = [];
    let postsRequests = 0;

    server.use(
      http.get("/api/search/search-users", async ({ request }) => {
        const url = new URL(request.url);
        const page = url.searchParams.get("page") ?? "1";
        requestedParams.push({
          keyword: url.searchParams.get("keyword"),
          page,
          limit: url.searchParams.get("limit")
        });

        if (page === "1") {
          await page1Gate;
          return HttpResponse.json({
            data: [
              buildMockUser({
                _id: "u_ana_1",
                fullName: "Ana Primera",
                username: "ana_primera",
                location: "Madrid"
              })
            ],
            hasMore: true,
            nextPage: 2
          });
        }

        return HttpResponse.json({
          data: [
            buildMockUser({
              _id: "u_ana_2",
              fullName: "Ana Segunda",
              username: "ana_segunda",
              location: "Bogotá"
            })
          ],
          hasMore: false,
          nextPage: null
        });
      }),
      http.get("/api/search/search-posts", () => {
        postsRequests += 1;
        return HttpResponse.json({
          data: [],
          hasMore: false,
          nextPage: null,
          totalResults: 0
        });
      })
    );

    const { container } = renderDiscoverPage([
      "/discover?searchTerm=ana&type=people"
    ]);

    // Mientras carga: skeletons visibles y Placeholder oculto
    await waitFor(() => {
      expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    });
    expect(
      screen.queryByRole("heading", { level: 2, name: "Explora y descubre" })
    ).not.toBeInTheDocument();

    act(() => {
      releasePage1();
    });

    expect(await screen.findByText("Ana Primera")).toBeInTheDocument();
    expect(screen.getByText("@ana_primera")).toBeInTheDocument();
    expect(screen.queryByText("Ana Segunda")).not.toBeInTheDocument();
    expect(requestedParams).toEqual([{ keyword: "ana", page: "1", limit: "10" }]);
    expect(postsRequests).toBe(0);

    // Disparar paginación infinita para cargar la página 2
    const sentinel = await waitFor(() => {
      const node = container.querySelector("div.w-full.h-10");
      expect(node).not.toBeNull();
      return node as HTMLDivElement;
    });

    act(() => {
      io.enterNode(sentinel);
    });

    expect(await screen.findByText("Ana Segunda")).toBeInTheDocument();
    expect(screen.getByText("Ana Primera")).toBeInTheDocument();
    expect(requestedParams).toEqual([
      { keyword: "ana", page: "1", limit: "10" },
      { keyword: "ana", page: "2", limit: "10" }
    ]);
  });

  it("busca publicaciones (?searchTerm=react&type=posts), muestra skeletons, contador totalResults y lista de PostCard", async () => {
    let releasePosts!: () => void;
    const postsGate = new Promise<void>((resolve) => {
      releasePosts = resolve;
    });

    let capturedParams: {
      keyword: string | null;
      page: string | null;
      limit: string | null;
    } | null = null;
    let usersRequests = 0;

    server.use(
      http.get("/api/search/search-posts", async ({ request }) => {
        const url = new URL(request.url);
        capturedParams = {
          keyword: url.searchParams.get("keyword"),
          page: url.searchParams.get("page"),
          limit: url.searchParams.get("limit")
        };

        await postsGate;

        return HttpResponse.json({
          data: [
            buildMockPostWithLikes({
              _id: "p_react_1",
              postType: "text",
              imageUrls: [],
              content: "Guía práctica de React 19"
            }),
            buildMockPostWithLikes({
              _id: "p_react_2",
              postType: "text",
              imageUrls: [],
              content: "Patrones avanzados en React"
            })
          ],
          hasMore: false,
          nextPage: null,
          totalResults: 2
        });
      }),
      http.get("/api/search/search-users", () => {
        usersRequests += 1;
        return HttpResponse.json({ data: [], hasMore: false, nextPage: null });
      })
    );

    renderDiscoverPage(["/discover?searchTerm=react&type=posts"]);

    await waitFor(() => {
      expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    });
    expect(
      screen.queryByRole("heading", { level: 2, name: "Explora y descubre" })
    ).not.toBeInTheDocument();

    act(() => {
      releasePosts();
    });

    expect(await screen.findByText("Guía práctica de React 19")).toBeInTheDocument();
    expect(screen.getByText("Patrones avanzados en React")).toBeInTheDocument();
    expect(screen.getAllByTestId("post-card")).toHaveLength(2);

    expect(
      screen.getByText((_, node) =>
        node?.tagName === "P" &&
        node.textContent === 'Se encontraron 2 publicaciones para el término "react"'
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Fin de los resultados")).toBeInTheDocument();

    expect(capturedParams).toEqual({ keyword: "react", page: "1", limit: "5" });
    expect(usersRequests).toBe(0);
  });

  it("muestra NoResults para personas cuando la API devuelve vacío y permite reiniciar la búsqueda con 'Intentar otra búsqueda'", async () => {
    const user = userEvent.setup();

    renderDiscoverPage(["/discover?searchTerm=nadie123&type=people"]);

    expect(
      await screen.findByText((_, node) =>
        node?.tagName === "P" &&
        node.textContent === 'No se encontraron personas para "nadie123"'
      )
    ).toBeInTheDocument();

    const searchInput = screen.getByRole("searchbox");
    expect(searchInput).toHaveValue("nadie123");

    await user.click(screen.getByRole("button", { name: "Intentar otra búsqueda" }));

    expect(
      await screen.findByRole("heading", { level: 2, name: "Explora y descubre" })
    ).toBeInTheDocument();
    expect(searchInput).toHaveValue("");
    expect(searchInput).toHaveFocus();
  });

  it("muestra NoResults para publicaciones cuando no hay coincidencias", async () => {
    renderDiscoverPage(["/discover?searchTerm=sinposts&type=posts"]);

    expect(
      await screen.findByText((_, node) =>
        node?.tagName === "P" &&
        node.textContent === 'No se encontraron publicaciones para "sinposts"'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText("Fin de los resultados")).not.toBeInTheDocument();
  });

  it("alterna entre los filtros 'Personas' y 'Publicaciones' en FiltersBar conservando el searchTerm", async () => {
    const user = userEvent.setup();
    const capturedUserKeywords: Array<string | null> = [];
    const capturedPostKeywords: Array<string | null> = [];

    server.use(
      http.get("/api/search/search-users", ({ request }) => {
        capturedUserKeywords.push(new URL(request.url).searchParams.get("keyword"));
        return HttpResponse.json({
          data: [
            buildMockUser({
              _id: "u_dev_1",
              fullName: "Dev Persona",
              username: "dev_persona"
            })
          ],
          hasMore: false,
          nextPage: null
        });
      }),
      http.get("/api/search/search-posts", ({ request }) => {
        capturedPostKeywords.push(new URL(request.url).searchParams.get("keyword"));
        return HttpResponse.json({
          data: [
            buildMockPostWithLikes({
              _id: "p_dev_1",
              postType: "text",
              imageUrls: [],
              content: "Publicación sobre desarrollo"
            })
          ],
          hasMore: false,
          nextPage: null,
          totalResults: 1
        });
      })
    );

    renderDiscoverPage(["/discover?searchTerm=dev&type=people"]);

    expect(await screen.findByText("Dev Persona")).toBeInTheDocument();
    expect(screen.queryByText("Publicación sobre desarrollo")).not.toBeInTheDocument();
    expect(capturedUserKeywords).toEqual(["dev"]);
    expect(capturedPostKeywords).toEqual([]);

    // Verificar que FiltersBar conserva searchTerm en ambos enlaces y cambiar a Publicaciones
    const postsFilterLink = screen.getByRole("link", { name: "Publicaciones" });
    const peopleFilterLink = screen.getByRole("link", { name: "Personas" });
    expect(postsFilterLink).toHaveAttribute(
      "href",
      "/discover/?searchTerm=dev&type=posts"
    );
    expect(peopleFilterLink).toHaveAttribute(
      "href",
      "/discover/?searchTerm=dev&type=people"
    );

    await user.click(postsFilterLink);

    expect(await screen.findByText("Publicación sobre desarrollo")).toBeInTheDocument();
    expect(screen.queryByText("Dev Persona")).not.toBeInTheDocument();
    expect(capturedPostKeywords).toEqual(["dev"]);

    // Volver al filtro Personas conservando searchTerm=dev
    await user.click(peopleFilterLink);

    expect(await screen.findByText("Dev Persona")).toBeInTheDocument();
    expect(screen.queryByText("Publicación sobre desarrollo")).not.toBeInTheDocument();
    expect(capturedUserKeywords.length).toBeGreaterThanOrEqual(2);
    expect(capturedUserKeywords.every((kw) => kw === "dev")).toBe(true);
  });

  it("ejecuta búsqueda de personas por defecto tras escribir en SearchBar con debounce", async () => {
    const user = userEvent.setup();
    let capturedKeyword: string | null = null;

    server.use(
      http.get("/api/search/search-users", ({ request }) => {
        capturedKeyword = new URL(request.url).searchParams.get("keyword");
        return HttpResponse.json({
          data: [
            buildMockUser({
              _id: "u_sofia",
              fullName: "Sofía Buscada",
              username: "sofia_b"
            })
          ],
          hasMore: false,
          nextPage: null
        });
      })
    );

    renderDiscoverPage(["/discover"]);

    expect(
      screen.getByRole("heading", { level: 2, name: "Explora y descubre" })
    ).toBeInTheDocument();

    const searchInput = screen.getByRole("searchbox");
    await user.type(searchInput, "sofia");

    expect(await screen.findByText("Sofía Buscada", {}, { timeout: 2000 })).toBeInTheDocument();
    expect(capturedKeyword).toBe("sofia");
    expect(
      screen.queryByRole("heading", { level: 2, name: "Explora y descubre" })
    ).not.toBeInTheDocument();
  });

  it("muestra toast.error si falla la petición de búsqueda", async () => {
    server.use(
      http.get("/api/search/search-users", () =>
        HttpResponse.json(
          { message: "Error al buscar usuarios" },
          { status: 500 }
        )
      )
    );

    const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "toast-id");

    renderDiscoverPage(["/discover?searchTerm=fallo&type=people"]);

    await waitFor(() => {
      expect(toastErrorSpy).toHaveBeenCalledWith("Error al buscar usuarios");
    });
  });
});
