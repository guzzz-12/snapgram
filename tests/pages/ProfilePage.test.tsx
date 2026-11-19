import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ImageKitProvider } from "@imagekit/react";
import { mockIntersectionObserver } from "jsdom-testing-mocks";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import ProfilePage from "@/pages/ProfilePage";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthContext, type AuthContext as AuthContextType } from "@/providers/AuthProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { server } from "../mocks/server";
import {
  buildMockFollowed,
  buildMockFollower,
  buildMockUser
} from "../mocks/users/factories";
import { buildMockPostWithLikes } from "../mocks/posts/factories";

// `react-responsive-masonry` asigna una propiedad de solo lectura en su build CJS y falla al cargarse
// bajo Node/Vitest. Se sustituye por un contenedor simple: el layout no forma parte del SUT.
vi.mock("react-responsive-masonry", () => ({
  default: ({ children }: { children: ReactNode }) => <div data-testid="masonry">{children}</div>
}));

// `DeleteAccountModal` (dentro de ProfileHeader) usa `useReverification` de Clerk, que exige un
// <ClerkProvider />. El flujo de reverificación de Clerk queda fuera del alcance de esta página.
vi.mock("@clerk/clerk-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clerk/clerk-react")>();

  return {
    ...actual,
    useReverification: (fn: () => unknown) => fn
  };
});

/**
 * Suite de integración para la página de perfil de usuario (`src/pages/ProfilePage.tsx`).
 *
 * Propósito:
 *   Validar la visualización del perfil propio frente al de terceros, la navegación entre
 *   pestañas con sus listas paginadas y el manejo de los estados de error de la API
 *   (perfil bloqueado/desactivado, usuario inexistente y errores genéricos).
 *
 * Qué evalúa y alcance (SUT):
 *   - Carga: muestra `ProfileHeaderSkeleton` (sin cabecera ni pestañas) mientras
 *     `GET /api/users/:clerkId` está pendiente y luego `ProfileHeader` con las pestañas y contadores.
 *   - Perfil propio vs ajeno: la pestaña `"Me gusta"` existe **solo** si `:userClerkId === userId`
 *     y su consulta (`GET /api/likes/liked-posts`) jamás se dispara en perfiles de terceros.
 *   - Pestañas: `"Posts"`, `"Seguidores"`, `"Siguiendo"` y `"Me gusta"` consultan sus endpoints con el
 *     `_id` del usuario del perfil, pintan su contenido y desmontan el de la pestaña anterior;
 *     la lista de seguidores pagina con IntersectionObserver (`page=1` → `page=2`).
 *   - Reseteo: al cambiar `:userClerkId` la pestaña activa vuelve a `"Posts"`.
 *   - `is_blocked` / `account_disabled`: pantalla `"Este perfil no está disponible actualmente."`
 *     con botón `"Volver"` que navega a `/` y sin toast de error.
 *   - 404: `toast.error("Usuario no encontrado.")` y redirección a `/`.
 *   - Otros errores (500): `toast.error("Error al obtener el usuario.")` sin redirección ni pantalla
 *     de perfil no disponible.
 */
describe("ProfilePage", () => {
  let queryClient: QueryClient;
  let io: ReturnType<typeof mockIntersectionObserver>;

  const SELF_CLERK_ID = "clerk_self_1";

  const renderProfile = (route: string, authUserId: string | null = SELF_CLERK_ID) => {
    const authValue: AuthContextType = {
      userId: authUserId,
      isLoaded: true,
      isSignedIn: Boolean(authUserId),
      signOut: vi.fn().mockResolvedValue(undefined) as unknown as AuthContextType["signOut"],
      getToken: vi.fn().mockResolvedValue("jwt") as unknown as AuthContextType["getToken"]
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <ImageKitProvider urlEndpoint="https://ik.imagekit.io/y1lpjbueh/">
            <TooltipProvider>
              <MemoryRouter initialEntries={[route]}>
                <Routes>
                  <Route
                    path="/profile/:userClerkId"
                    element={
                      <>
                        <Link to="/profile/clerk_b">ir-a-perfil-b</Link>
                        <ProfilePage />
                      </>
                    }
                  />
                  <Route path="/" element={<div data-testid="home-route">Home</div>} />
                </Routes>
              </MemoryRouter>
            </TooltipProvider>
          </ImageKitProvider>
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  };

  const resetStores = () => {
    useCurrentUser.setState({ user: null, loadingUser: false });
  };

  beforeEach(() => {
    io = mockIntersectionObserver();
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
    resetStores();
  });

  describe("perfil propio vs perfil ajeno", () => {
    it("muestra el skeleton mientras carga y luego la cabecera, las pestañas con contadores y la pestaña 'Me gusta' en el perfil propio", async () => {
      const profile = buildMockUser({
        _id: "usr_self_1",
        clerkId: SELF_CLERK_ID,
        fullName: "Laura Propia",
        username: "laura_p",
        postsCount: 3,
        followersCount: 2,
        followingCount: 1
      });

      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });

      server.use(
        http.get("/api/users/:userClerkId", async () => {
          await gate;
          return HttpResponse.json({ data: profile });
        })
      );

      useCurrentUser.setState({ user: profile, loadingUser: false });

      renderProfile(`/profile/${SELF_CLERK_ID}`);

      // Mientras la petición está pendiente: skeleton visible, sin cabecera ni pestañas
      await waitFor(() => {
        expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
      });
      expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
      expect(screen.queryByRole("tablist")).not.toBeInTheDocument();

      act(() => {
        release();
      });

      expect(
        await screen.findByRole("heading", { level: 1, name: "Laura Propia" })
      ).toBeInTheDocument();
      expect(screen.getByText("@laura_p")).toBeInTheDocument();

      expect(screen.getByRole("tab", { name: "3 Posts" })).toHaveAttribute("aria-selected", "true");
      expect(screen.getByRole("tab", { name: "2 Seguidores" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "1 Siguiendo" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Me gusta" })).toBeInTheDocument();

      // En el perfil propio no se muestra el botón de seguir
      expect(screen.queryByRole("button", { name: "Seguir" })).not.toBeInTheDocument();
      // Una vez resuelta también la pestaña de posts no queda ningún skeleton (cabecera ni tarjetas)
      expect(await screen.findByText("No se encontraron publicaciones.")).toBeInTheDocument();
      expect(document.querySelector('[data-slot="skeleton"]')).not.toBeInTheDocument();
    });

    it("oculta la pestaña 'Me gusta' y nunca consulta los likes en el perfil de otro usuario", async () => {
      let likedPostsRequests = 0;

      const profile = buildMockUser({
        _id: "usr_other_9",
        clerkId: "clerk_other_9",
        fullName: "Pedro Ajeno",
        isFollowing: false
      });

      server.use(
        http.get("/api/users/:userClerkId", () => HttpResponse.json({ data: profile })),
        http.get("/api/likes/liked-posts", () => {
          likedPostsRequests += 1;
          return HttpResponse.json({ data: [], hasMore: false, nextPage: null });
        })
      );

      useCurrentUser.setState({
        user: buildMockUser({ _id: "usr_self_1", clerkId: SELF_CLERK_ID }),
        loadingUser: false
      });

      renderProfile("/profile/clerk_other_9");

      expect(
        await screen.findByRole("heading", { level: 1, name: "Pedro Ajeno" })
      ).toBeInTheDocument();

      expect(screen.getByRole("tab", { name: /Posts$/ })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /Seguidores$/ })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /Siguiendo$/ })).toBeInTheDocument();
      expect(screen.queryByRole("tab", { name: "Me gusta" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Seguir" })).toBeInTheDocument();

      // Dar tiempo a que cualquier consulta indebida se dispare
      await screen.findByText("No se encontraron publicaciones.");
      expect(likedPostsRequests).toBe(0);
    });
  });

  describe("navegación entre pestañas", () => {
    it("consulta y pinta Posts, Seguidores, Siguiendo y Me gusta con el _id del usuario y desmonta la pestaña anterior", async () => {
      const user = userEvent.setup();

      const profile = buildMockUser({
        _id: "usr_self_1",
        clerkId: SELF_CLERK_ID,
        fullName: "Laura Propia",
        postsCount: 1,
        followersCount: 1,
        followingCount: 1
      });

      const captured: Record<string, { id?: string; page: string | null; limit: string | null }> = {};
      const capture = (key: string, id: string | undefined, request: Request) => {
        const url = new URL(request.url);
        captured[key] = {
          id,
          page: url.searchParams.get("page"),
          limit: url.searchParams.get("limit")
        };
      };

      server.use(
        http.get("/api/users/:userClerkId", () => HttpResponse.json({ data: profile })),
        http.get("/api/posts/user/:userId", ({ params, request }) => {
          capture("posts", params.userId as string, request);
          return HttpResponse.json({
            data: [buildMockPostWithLikes({ content: "Contenido del post propio" })],
            hasMore: false,
            nextPage: null
          });
        }),
        http.get("/api/follows/get-followers/:userId", ({ params, request }) => {
          capture("followers", params.userId as string, request);
          return HttpResponse.json({
            data: [buildMockFollower({ fullName: "Ana Seguidora", username: "ana_s" })],
            hasMore: false,
            nextPage: null
          });
        }),
        http.get("/api/follows/get-following/:userId", ({ params, request }) => {
          capture("following", params.userId as string, request);
          return HttpResponse.json({
            data: [buildMockFollowed({ fullName: "Beto Seguido", username: "beto_s" })],
            hasMore: false,
            nextPage: null
          });
        }),
        http.get("/api/likes/liked-posts", ({ request }) => {
          capture("likes", undefined, request);
          return HttpResponse.json({
            data: [buildMockPostWithLikes({ content: "Contenido gustado" })],
            hasMore: false,
            nextPage: null
          });
        })
      );

      useCurrentUser.setState({ user: profile, loadingUser: false });

      renderProfile(`/profile/${SELF_CLERK_ID}`);

      // Pestaña Posts (por defecto)
      expect(await screen.findByText("Contenido del post propio")).toBeInTheDocument();
      expect(captured.posts).toEqual({ id: "usr_self_1", page: "1", limit: "5" });

      // Pestaña Seguidores
      await user.click(screen.getByRole("tab", { name: "1 Seguidores" }));
      expect(await screen.findByText("Ana Seguidora")).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "1 Seguidores" })).toHaveAttribute("aria-selected", "true");
      expect(screen.queryByText("Contenido del post propio")).not.toBeInTheDocument();
      expect(captured.followers).toEqual({ id: "usr_self_1", page: "1", limit: "5" });

      // Pestaña Siguiendo
      await user.click(screen.getByRole("tab", { name: "1 Siguiendo" }));
      expect(await screen.findByText("Beto Seguido")).toBeInTheDocument();
      expect(screen.queryByText("Ana Seguidora")).not.toBeInTheDocument();
      expect(captured.following).toEqual({ id: "usr_self_1", page: "1", limit: "5" });

      // Pestaña Me gusta
      await user.click(screen.getByRole("tab", { name: "Me gusta" }));
      expect(await screen.findByText("Contenido gustado")).toBeInTheDocument();
      expect(screen.queryByText("Beto Seguido")).not.toBeInTheDocument();
      expect(captured.likes).toEqual({ id: undefined, page: "1", limit: "10" });
    });

    it("pagina la lista de seguidores al llegar al final (page=1 → page=2)", async () => {
      const user = userEvent.setup();

      const profile = buildMockUser({
        _id: "usr_self_1",
        clerkId: SELF_CLERK_ID,
        followersCount: 2
      });

      const requestedPages: string[] = [];

      server.use(
        http.get("/api/users/:userClerkId", () => HttpResponse.json({ data: profile })),
        http.get("/api/follows/get-followers/:userId", ({ request }) => {
          const page = new URL(request.url).searchParams.get("page") ?? "1";
          requestedPages.push(page);

          return page === "1"
            ? HttpResponse.json({
                data: [buildMockFollower({ fullName: "Primera Pagina" })],
                hasMore: true,
                nextPage: 2
              })
            : HttpResponse.json({
                data: [buildMockFollower({ fullName: "Segunda Pagina" })],
                hasMore: false,
                nextPage: null
              });
        })
      );

      useCurrentUser.setState({ user: profile, loadingUser: false });

      const { container } = renderProfile(`/profile/${SELF_CLERK_ID}`);

      await user.click(await screen.findByRole("tab", { name: "2 Seguidores" }));
      expect(await screen.findByText("Primera Pagina")).toBeInTheDocument();
      expect(screen.queryByText("Segunda Pagina")).not.toBeInTheDocument();
      expect(requestedPages).toEqual(["1"]);

      const sentinel = await waitFor(() => {
        const node = container.querySelector("ul > div.h-10");
        expect(node).not.toBeNull();
        return node as HTMLDivElement;
      });

      act(() => {
        io.enterNode(sentinel);
      });

      expect(await screen.findByText("Segunda Pagina")).toBeInTheDocument();
      expect(screen.getByText("Primera Pagina")).toBeInTheDocument();
      expect(requestedPages).toEqual(["1", "2"]);
    });

    it("restablece la pestaña activa a 'Posts' al cambiar el parámetro :userClerkId", async () => {
      const user = userEvent.setup();

      server.use(
        http.get("/api/users/:userClerkId", ({ params }) => {
          const clerkId = params.userClerkId as string;
          return HttpResponse.json({
            data: buildMockUser({
              clerkId,
              fullName: clerkId === "clerk_a" ? "Alicia Uno" : "Bruno Dos"
            })
          });
        })
      );

      renderProfile("/profile/clerk_a");

      expect(
        await screen.findByRole("heading", { level: 1, name: "Alicia Uno" })
      ).toBeInTheDocument();

      await user.click(screen.getByRole("tab", { name: /Seguidores$/ }));
      expect(screen.getByRole("tab", { name: /Seguidores$/ })).toHaveAttribute("aria-selected", "true");

      await user.click(screen.getByRole("link", { name: "ir-a-perfil-b" }));

      expect(
        await screen.findByRole("heading", { level: 1, name: "Bruno Dos" })
      ).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /Posts$/ })).toHaveAttribute("aria-selected", "true");
      expect(screen.getByRole("tab", { name: /Seguidores$/ })).toHaveAttribute("aria-selected", "false");
    });
  });

  describe("errores de la API", () => {
    it.each([
      ["is_blocked"],
      ["account_disabled"]
    ])(
      "muestra la pantalla de perfil no disponible para '%s' y el botón 'Volver' navega a /",
      async (statusMessage) => {
        const user = userEvent.setup();
        const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "toast-id");

        server.use(
          http.get("/api/users/:userClerkId", () =>
            HttpResponse.json({ message: statusMessage }, { status: 403 })
          )
        );

        renderProfile("/profile/clerk_hidden");

        expect(
          await screen.findByRole("heading", {
            level: 1,
            name: "Este perfil no está disponible actualmente."
          })
        ).toBeInTheDocument();
        expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
        expect(screen.queryByTestId("home-route")).not.toBeInTheDocument();
        expect(toastErrorSpy).not.toHaveBeenCalled();

        await user.click(screen.getByRole("button", { name: "Volver" }));

        expect(await screen.findByTestId("home-route")).toBeInTheDocument();
        expect(
          screen.queryByText("Este perfil no está disponible actualmente.")
        ).not.toBeInTheDocument();
      }
    );

    it("muestra toast 'Usuario no encontrado.' y redirige a / cuando la API responde 404", async () => {
      const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "toast-id");

      server.use(
        http.get("/api/users/:userClerkId", () =>
          HttpResponse.json({ message: "No existe" }, { status: 404 })
        )
      );

      renderProfile("/profile/clerk_missing");

      expect(await screen.findByTestId("home-route")).toBeInTheDocument();
      expect(toastErrorSpy).toHaveBeenCalledWith("Usuario no encontrado.");
      expect(toastErrorSpy).not.toHaveBeenCalledWith("Error al obtener el usuario.");
      expect(
        screen.queryByText("Este perfil no está disponible actualmente.")
      ).not.toBeInTheDocument();
      expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    });

    it("muestra toast 'Error al obtener el usuario.' sin redirigir ni mostrar la pantalla de perfil no disponible ante un error 500", async () => {
      const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "toast-id");

      server.use(
        http.get("/api/users/:userClerkId", () =>
          HttpResponse.json({ message: "Fallo interno" }, { status: 500 })
        )
      );

      renderProfile("/profile/clerk_broken");

      await waitFor(() => {
        expect(toastErrorSpy).toHaveBeenCalledWith("Error al obtener el usuario.");
      });

      expect(toastErrorSpy).not.toHaveBeenCalledWith("Usuario no encontrado.");
      expect(screen.queryByTestId("home-route")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Este perfil no está disponible actualmente.")
      ).not.toBeInTheDocument();
      expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    });
  });
});
