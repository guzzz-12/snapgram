import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, type InitialEntry } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import StoriesPage from "@/pages/StoriesPage";
import { AuthContext, type AuthContext as AuthContextType } from "@/providers/AuthProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { StoryType, UserWithStories } from "@/types/global";
import { server } from "../mocks/server";
import { buildMockUser } from "../mocks/users/factories";
import {
  buildMockStory,
  buildMockUserWithStories
} from "../mocks/stories/factories";

/**
 * Suite de integración para la página de historias (`src/pages/StoriesPage.tsx`).
 *
 * Propósito:
 *   Validar la hidratación del visor de historias a partir del parámetro de ruta `:username`,
 *   el cierre mediante el botón `"Volver al inicio"` y la tecla `Escape`, la limpieza del
 *   listener global de teclado al desmontar y el flujo optimista completo de likes en historias.
 *
 * Qué evalúa y alcance (SUT):
 *   - Pasa `:username` a `<StoriesViewer storiesUsername={username} />` hidratando desde
 *     `GET /api/stories/:username`.
 *   - Navega a `"/"` al hacer clic en `"Volver al inicio"` y al presionar la tecla `Escape`.
 *   - Ignora otras teclas y limpia el listener `keydown` de `document` al desmontar.
 *   - Likes optimistas en `<StoriesViewer />` + `useToggleLikeStory`:
 *     - Actualización inmediata del botón y caché a 0ms sin deshabilitar el botón en vuelo.
 *     - Debounce de 250ms y coalescencia de ráfagas pares (0 peticiones) e impares (1 petición).
 *     - Rollback exacto (preservando likes ajenos) y `toast.error` sin refetch en fallos 500.
 *     - Sincronización de clics durante una petición en vuelo vía `onSettled`.
 *     - Colas independientes al cambiar entre historias antes de vencer el debounce.
 *     - Cancelación del timer pendiente al desmontar el visor evitando peticiones huérfanas.
 */
describe("StoriesPage", () => {
  let queryClient: QueryClient;

  const renderStoriesPage = (initialEntries: InitialEntry[]) => {
    const authValue: AuthContextType = {
      userId: "clerk_user_1",
      isLoaded: true,
      isSignedIn: true,
      signOut: vi.fn().mockResolvedValue(undefined) as unknown as AuthContextType["signOut"],
      getToken: vi.fn().mockResolvedValue("jwt-mock") as unknown as AuthContextType["getToken"]
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <MemoryRouter initialEntries={initialEntries}>
            <Routes>
              <Route path="/" element={<div data-testid="home-route">Home</div>} />
              <Route path="/stories/:username" element={<StoriesPage />} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
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

    useCurrentUser.setState({
      user: buildMockUser({
        _id: "usr_me_1",
        clerkId: "clerk_user_1",
        hasCryptoKeys: true
      }),
      loadingUser: false
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
    vi.restoreAllMocks();
    queryClient.clear();
    useCurrentUser.setState({ user: null, loadingUser: false });
  });

  it("renderiza StoriesViewer con el :username de la ruta y navega a '/' al pulsar 'Volver al inicio'", async () => {
    const user = userEvent.setup();
    let capturedUsername: string | undefined;

    const storyAuthor = buildMockUser({
      _id: "usr_me_1",
      clerkId: "clerk_user_1",
      username: "lucia_stories",
      fullName: "Lucía Historias"
    });
    const mockStories = buildMockUserWithStories({
      _id: storyAuthor._id,
      clerkId: storyAuthor.clerkId,
      username: "lucia_stories",
      fullName: "Lucía Historias",
      stories: [
        buildMockStory({
          _id: "st_lucia_1",
          user: storyAuthor,
          mediaType: "text",
          content: "Mi historia de prueba"
        })
      ]
    });

    server.use(
      http.get("/api/stories/:username", ({ params }) => {
        capturedUsername = params.username as string;
        return HttpResponse.json({ data: mockStories });
      })
    );

    renderStoriesPage(["/stories/lucia_stories"]);

    expect(await screen.findByText("Mi historia de prueba")).toBeInTheDocument();
    expect(capturedUsername).toBe("lucia_stories");

    await user.click(screen.getByRole("button", { name: "Volver al inicio" }));

    expect(await screen.findByTestId("home-route")).toBeInTheDocument();
    expect(screen.queryByText("Mi historia de prueba")).not.toBeInTheDocument();
  });

  it("navega a '/' al presionar Escape, ignora otras teclas y limpia el listener al desmontar", async () => {
    const storyAuthor = buildMockUser({
      _id: "usr_me_1",
      clerkId: "clerk_user_1",
      username: "mario_stories"
    });

    server.use(
      http.get("/api/stories/:username", () =>
        HttpResponse.json({
          data: buildMockUserWithStories({
            _id: storyAuthor._id,
            clerkId: storyAuthor.clerkId,
            username: "mario_stories",
            stories: [
              buildMockStory({
                _id: "st_mario_1",
                user: storyAuthor,
                mediaType: "text",
                content: "Historia de Mario"
              })
            ]
          })
        })
      )
    );

    const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

    renderStoriesPage(["/stories/mario_stories"]);

    expect(await screen.findByText("Historia de Mario")).toBeInTheDocument();

    // Otras teclas no deben cerrar el visor
    fireEvent.keyDown(document, { key: "Enter" });
    fireEvent.keyDown(document, { key: "a" });
    expect(screen.getByText("Historia de Mario")).toBeInTheDocument();
    expect(screen.queryByTestId("home-route")).not.toBeInTheDocument();

    // Escape sí debe navegar a "/" y desmontar limpiando el listener
    fireEvent.keyDown(document, { key: "Escape" });

    expect(await screen.findByTestId("home-route")).toBeInTheDocument();
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function)
    );
  });

  describe("likes optimistas en historias", () => {
    const flushZeroMs = async () => {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    };

    const setupForeignStories = (storiesOverride?: StoryType[]) => {
      const foreignAuthor = buildMockUser({
        _id: "usr_author_2",
        clerkId: "clerk_author_2",
        username: "ana_stories",
        fullName: "Ana Historias"
      });

      const stories = storiesOverride ?? [
        buildMockStory({
          _id: "st_ana_1",
          user: foreignAuthor,
          mediaType: "text",
          content: "Historia de Ana",
          likedBy: []
        })
      ];

      return {
        foreignAuthor,
        storiesPayload: buildMockUserWithStories({
          _id: foreignAuthor._id,
          clerkId: foreignAuthor.clerkId,
          username: "ana_stories",
          fullName: "Ana Historias",
          stories: stories.map((story) => ({ ...story, user: foreignAuthor }))
        })
      };
    };

    it("actualiza el botón de like de forma optimista a 0ms antes de enviar PUT, lo mantiene habilitado en vuelo y sincroniza tras 250ms", async () => {
      const { storiesPayload } = setupForeignStories();
      let serverLiked = false;
      let getRequests = 0;
      let putRequests = 0;
      let capturedStoryId: string | undefined;
      let releasePut!: () => void;

      server.use(
        http.get("/api/stories/:username", () => {
          getRequests += 1;
          return HttpResponse.json({
            data: {
              ...storiesPayload,
              stories: storiesPayload.stories.map((story) => ({
                ...story,
                likedBy: serverLiked
                  ? [{ user: "usr_me_1", likedAt: "2026-01-01T00:00:00.000Z" }]
                  : []
              }))
            }
          });
        }),
        http.put("/api/likes/story/:storyId", async ({ params }) => {
          putRequests += 1;
          capturedStoryId = params.storyId as string;

          await new Promise<void>((resolve) => {
            releasePut = resolve;
          });

          serverLiked = !serverLiked;
          return HttpResponse.json({
            data: {
              ...storiesPayload.stories[0],
              likedBy: serverLiked
                ? [{ user: "usr_me_1", likedAt: "2026-01-01T00:00:00.000Z" }]
                : []
            }
          });
        })
      );

      renderStoriesPage(["/stories/ana_stories"]);
      expect(await screen.findByText("Historia de Ana")).toBeInTheDocument();
      expect(getRequests).toBe(1);

      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const likeButton = screen.getByRole("button", { name: "Dar like a la historia" });
      expect(likeButton).toBeEnabled();
      expect(screen.queryByRole("button", { name: "Eliminar like de la historia" })).not.toBeInTheDocument();

      // Clic a 0ms: cambio optimista inmediato en UI y caché sin haber enviado la petición HTTP
      fireEvent.click(likeButton);
      await flushZeroMs();

      expect(putRequests).toBe(0);
      expect(screen.getByRole("button", { name: "Eliminar like de la historia" })).toBeEnabled();
      expect(screen.queryByRole("button", { name: "Dar like a la historia" })).not.toBeInTheDocument();
      expect(
        queryClient
          .getQueryData<UserWithStories>(["stories", "ana_stories"])
          ?.stories[0].likedBy.map((like) => like.user)
      ).toEqual(["usr_me_1"]);

      // A los 249ms el debounce todavía retiene la petición
      await act(async () => {
        await vi.advanceTimersByTimeAsync(249);
      });
      expect(putRequests).toBe(0);

      // Al cumplirse 250ms se dispara 1 petición PUT; mientras sigue en vuelo el botón NO se deshabilita
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
      expect(putRequests).toBe(1);
      expect(capturedStoryId).toBe("st_ana_1");
      expect(screen.getByRole("button", { name: "Eliminar like de la historia" })).toBeEnabled();
      expect(invalidateSpy).not.toHaveBeenCalled();

      // Resolver la petición PUT y verificar invalidación final
      await act(async () => {
        releasePut();
        await Promise.resolve();
      });
      await flushZeroMs();

      vi.useRealTimers();
      await vi.waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledTimes(1);
      });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["stories", "ana_stories"] });
      expect(getRequests).toBe(2);
      expect(screen.getByRole("button", { name: "Eliminar like de la historia" })).toBeEnabled();
    });

    it("coalesce ráfagas rápidas: ráfaga par cancela sin peticiones HTTP y ráfaga impar envía una única petición", async () => {
      const { storiesPayload } = setupForeignStories();
      let serverLiked = false;
      let putRequests = 0;

      server.use(
        http.get("/api/stories/:username", () =>
          HttpResponse.json({
            data: {
              ...storiesPayload,
              stories: storiesPayload.stories.map((story) => ({
                ...story,
                likedBy: serverLiked
                  ? [{ user: "usr_me_1", likedAt: "2026-01-01T00:00:00.000Z" }]
                  : []
              }))
            }
          })
        ),
        http.put("/api/likes/story/:storyId", () => {
          putRequests += 1;
          serverLiked = !serverLiked;
          return HttpResponse.json({ data: storiesPayload.stories[0] });
        })
      );

      renderStoriesPage(["/stories/ana_stories"]);
      expect(await screen.findByText("Historia de Ana")).toBeInTheDocument();

      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      // Ráfaga par (2 clics dentro de 250ms): alterna optimista y revierte sin enviar PUT
      fireEvent.click(screen.getByRole("button", { name: "Dar like a la historia" }));
      await flushZeroMs();
      expect(screen.getByRole("button", { name: "Eliminar like de la historia" })).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      fireEvent.click(screen.getByRole("button", { name: "Eliminar like de la historia" }));
      await flushZeroMs();
      expect(screen.getByRole("button", { name: "Dar like a la historia" })).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });

      expect(putRequests).toBe(0);
      expect(invalidateSpy).not.toHaveBeenCalled();
      expect(
        queryClient.getQueryData<UserWithStories>(["stories", "ana_stories"])?.stories[0].likedBy
      ).toEqual([]);

      // Ráfaga impar (3 clics dentro de 250ms): reinicia debounce en cada clic y envía 1 único PUT
      fireEvent.click(screen.getByRole("button", { name: "Dar like a la historia" }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(80);
      });

      fireEvent.click(screen.getByRole("button", { name: "Eliminar like de la historia" }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(80);
      });

      fireEvent.click(screen.getByRole("button", { name: "Dar like a la historia" }));
      await flushZeroMs();
      expect(screen.getByRole("button", { name: "Eliminar like de la historia" })).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(249);
      });
      expect(putRequests).toBe(0);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });

      expect(putRequests).toBe(1);
      expect(screen.getByRole("button", { name: "Eliminar like de la historia" })).toBeInTheDocument();
      expect(
        queryClient
          .getQueryData<UserWithStories>(["stories", "ana_stories"])
          ?.stories[0].likedBy.map((like) => like.user)
      ).toEqual(["usr_me_1"]);
    });

    it("revierte la UI optimista y la caché preservando likes ajenos y muestra toast.error sin refetch si PUT falla con 500", async () => {
      const existingOtherLike = { user: "usr_other_99", likedAt: "2026-01-01T00:00:00.000Z" };
      const { storiesPayload } = setupForeignStories([
        buildMockStory({
          _id: "st_ana_err",
          mediaType: "text",
          content: "Historia con error",
          likedBy: [existingOtherLike]
        })
      ]);

      let getRequests = 0;
      let putRequests = 0;
      let rejectPut!: () => void;

      server.use(
        http.get("/api/stories/:username", () => {
          getRequests += 1;
          return HttpResponse.json({ data: storiesPayload });
        }),
        http.put("/api/likes/story/:storyId", async () => {
          putRequests += 1;
          await new Promise<void>((resolve) => {
            rejectPut = resolve;
          });
          return HttpResponse.json(
            { message: "Error al dar like a la historia" },
            { status: 500 }
          );
        })
      );

      renderStoriesPage(["/stories/ana_stories"]);
      expect(await screen.findByText("Historia con error")).toBeInTheDocument();
      expect(getRequests).toBe(1);

      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      let resolveErrorToast!: () => void;
      const errorToastCalled = new Promise<void>((resolve) => {
        resolveErrorToast = resolve;
      });
      const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => {
        resolveErrorToast();
        return "toast-id";
      });
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      fireEvent.click(screen.getByRole("button", { name: "Dar like a la historia" }));
      await flushZeroMs();

      // Estado optimista visible antes de enviar y mientras la respuesta 500 está en vuelo
      expect(screen.getByRole("button", { name: "Eliminar like de la historia" })).toBeInTheDocument();
      expect(toastErrorSpy).not.toHaveBeenCalled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(250);
      });
      expect(putRequests).toBe(1);
      expect(screen.getByRole("button", { name: "Eliminar like de la historia" })).toBeInTheDocument();

      // Responder 500 y esperar a que onError ejecute el rollback antes de restaurar timers reales
      await act(async () => {
        rejectPut();
        await errorToastCalled;
      });
      await flushZeroMs();

      vi.useRealTimers();
      expect(toastErrorSpy).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("button", { name: "Dar like a la historia" })).toBeInTheDocument();

      expect(toastErrorSpy).toHaveBeenCalledWith("Error al dar like a la historia");
      expect(screen.queryByRole("button", { name: "Eliminar like de la historia" })).not.toBeInTheDocument();
      expect(
        queryClient.getQueryData<UserWithStories>(["stories", "ana_stories"])?.stories[0].likedBy
      ).toEqual([existingOtherLike]);
      expect(invalidateSpy).not.toHaveBeenCalled();
      expect(getRequests).toBe(1);
    });

    it("revierte la UI optimista a estado liked si falla PUT al quitar un like existente", async () => {
      const existingMyLike = { user: "usr_me_1", likedAt: "2026-01-01T00:00:00.000Z" };
      const { storiesPayload } = setupForeignStories([
        buildMockStory({
          _id: "st_ana_unlike_err",
          mediaType: "text",
          content: "Historia ya gustada",
          likedBy: [existingMyLike]
        })
      ]);

      let putRequests = 0;

      server.use(
        http.get("/api/stories/:username", () => HttpResponse.json({ data: storiesPayload })),
        http.put("/api/likes/story/:storyId", () => {
          putRequests += 1;
          return HttpResponse.json(
            { message: "Error al quitar like" },
            { status: 500 }
          );
        })
      );

      renderStoriesPage(["/stories/ana_stories"]);
      expect(await screen.findByText("Historia ya gustada")).toBeInTheDocument();

      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      let resolveErrorToast!: () => void;
      const errorToastCalled = new Promise<void>((resolve) => {
        resolveErrorToast = resolve;
      });
      const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => {
        resolveErrorToast();
        return "toast-id";
      });

      fireEvent.click(screen.getByRole("button", { name: "Eliminar like de la historia" }));
      await flushZeroMs();

      // Cambio optimista inmediato a no-liked
      expect(putRequests).toBe(0);
      expect(screen.getByRole("button", { name: "Dar like a la historia" })).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(250);
        await errorToastCalled;
        await vi.advanceTimersByTimeAsync(1);
      });

      vi.useRealTimers();
      expect(toastErrorSpy).toHaveBeenCalledWith("Error al quitar like");
      expect(putRequests).toBe(1);
      expect(
        queryClient.getQueryData<UserWithStories>(["stories", "ana_stories"])?.stories[0].likedBy
      ).toEqual([existingMyLike]);
      expect(screen.getByRole("button", { name: "Eliminar like de la historia" })).toBeInTheDocument();
    });

    it("sincroniza un clic realizado durante una petición en vuelo disparando un único seguimiento en onSettled", async () => {
      const { storiesPayload } = setupForeignStories();
      let serverLiked = false;
      let putRequests = 0;
      const pendingResolvers: Array<() => void> = [];

      server.use(
        http.get("/api/stories/:username", () =>
          HttpResponse.json({
            data: {
              ...storiesPayload,
              stories: storiesPayload.stories.map((story) => ({
                ...story,
                likedBy: serverLiked
                  ? [{ user: "usr_me_1", likedAt: "2026-01-01T00:00:00.000Z" }]
                  : []
              }))
            }
          })
        ),
        http.put("/api/likes/story/:storyId", async () => {
          putRequests += 1;
          await new Promise<void>((resolve) => {
            pendingResolvers.push(resolve);
          });
          serverLiked = !serverLiked;
          return HttpResponse.json({ data: storiesPayload.stories[0] });
        })
      );

      renderStoriesPage(["/stories/ana_stories"]);
      expect(await screen.findByText("Historia de Ana")).toBeInTheDocument();

      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      // 1. Primer clic -> tras 250ms inicia PUT #1 y queda en vuelo
      fireEvent.click(screen.getByRole("button", { name: "Dar like a la historia" }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(250);
      });
      expect(putRequests).toBe(1);
      expect(pendingResolvers).toHaveLength(1);

      // 2. Clic mientras PUT #1 sigue en vuelo -> UI revierte al instante sin abrir PUT concurrente
      const unlikeBtn = screen.getByRole("button", { name: "Eliminar like de la historia" });
      expect(unlikeBtn).toBeEnabled();
      fireEvent.click(unlikeBtn);
      await flushZeroMs();
      expect(screen.getByRole("button", { name: "Dar like a la historia" })).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(250);
      });
      expect(putRequests).toBe(1);
      expect(invalidateSpy).not.toHaveBeenCalled();

      // 3. Al resolver PUT #1, onSettled detecta el clic pendiente impar y dispara PUT #2
      await act(async () => {
        pendingResolvers.shift()!();
        await Promise.resolve();
      });
      await flushZeroMs();

      vi.useRealTimers();
      await vi.waitFor(() => {
        expect(putRequests).toBe(2);
      });
      expect(pendingResolvers).toHaveLength(1);
      expect(invalidateSpy).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Dar like a la historia" })).toBeInTheDocument();

      // 4. Al resolver PUT #2, finaliza la sincronización e invalida la query
      await act(async () => {
        pendingResolvers.shift()!();
        await Promise.resolve();
      });

      await vi.waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledTimes(1);
      });
      expect(screen.getByRole("button", { name: "Dar like a la historia" })).toBeInTheDocument();
      expect(
        queryClient.getQueryData<UserWithStories>(["stories", "ana_stories"])?.stories[0].likedBy
      ).toEqual([]);
    });

    it("mantiene colas independientes por historia al navegar entre historias antes de vencer el debounce y revierte solo la que falla", async () => {
      const { storiesPayload } = setupForeignStories([
        buildMockStory({
          _id: "st_1",
          mediaType: "text",
          content: "Primera historia",
          likedBy: []
        }),
        buildMockStory({
          _id: "st_2",
          mediaType: "text",
          content: "Segunda historia",
          likedBy: []
        })
      ]);

      const requestedStoryIds: string[] = [];
      const serverLikedIds = new Set<string>();

      server.use(
        http.get("/api/stories/:username", () =>
          HttpResponse.json({
            data: {
              ...storiesPayload,
              stories: storiesPayload.stories.map((story) => ({
                ...story,
                likedBy: serverLikedIds.has(story._id)
                  ? [{ user: "usr_me_1", likedAt: "2026-01-01T00:00:00.000Z" }]
                  : []
              }))
            }
          })
        ),
        http.put("/api/likes/story/:storyId", ({ params }) => {
          const id = params.storyId as string;
          requestedStoryIds.push(id);

          if (id === "st_1") {
            return HttpResponse.json({ message: "Fallo en st_1" }, { status: 500 });
          }

          serverLikedIds.add(id);
          return HttpResponse.json({
            data: {
              ...storiesPayload.stories[1],
              likedBy: [{ user: "usr_me_1", likedAt: "2026-01-01T00:00:00.000Z" }]
            }
          });
        })
      );

      const { container } = renderStoriesPage(["/stories/ana_stories"]);
      expect(await screen.findByText("Primera historia")).toBeInTheDocument();

      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "toast-id");

      // Dar like en st_1
      fireEvent.click(screen.getByRole("button", { name: "Dar like a la historia" }));
      await flushZeroMs();
      expect(screen.getByRole("button", { name: "Eliminar like de la historia" })).toBeInTheDocument();

      // Avanzar solo 50ms (st_1 sigue en debounce) y pasar a st_2
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });

      const nextBtn = container.querySelector("svg.lucide-circle-chevron-right")?.closest("button");
      expect(nextBtn).toBeInstanceOf(HTMLButtonElement);
      fireEvent.click(nextBtn!);

      expect(screen.getByText("Segunda historia")).toBeInTheDocument();
      // st_2 no debe heredar el estado visual de st_1
      expect(screen.getByRole("button", { name: "Dar like a la historia" })).toBeInTheDocument();

      // Dar like en st_2
      fireEvent.click(screen.getByRole("button", { name: "Dar like a la historia" }));
      await flushZeroMs();
      expect(screen.getByRole("button", { name: "Eliminar like de la historia" })).toBeInTheDocument();

      // Avanzar para que ambos debounces disparen sus respectivas peticiones
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });
      await flushZeroMs();

      vi.useRealTimers();
      await vi.waitFor(() => {
        expect(toastErrorSpy).toHaveBeenCalledWith("Fallo en st_1");
      });

      expect(requestedStoryIds).toEqual(["st_1", "st_2"]);

      // st_1 debe haberse revertido a [], mientras st_2 conserva el like
      const cachedStories = queryClient.getQueryData<UserWithStories>([
        "stories",
        "ana_stories"
      ])?.stories;
      expect(cachedStories?.[0].likedBy).toEqual([]);
      expect(cachedStories?.[1].likedBy.map((like) => like.user)).toEqual(["usr_me_1"]);
      expect(screen.getByRole("button", { name: "Eliminar like de la historia" })).toBeInTheDocument();

      // Al volver a st_1, su botón refleja el rollback
      const prevBtn = container.querySelector("svg.lucide-circle-chevron-left")?.closest("button");
      expect(prevBtn).toBeInstanceOf(HTMLButtonElement);
      fireEvent.click(prevBtn!);
      expect(screen.getByText("Primera historia")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Dar like a la historia" })).toBeInTheDocument();
    });

    it("cancela el timer de debounce pendiente al cerrar el visor antes de los 250ms evitando peticiones huérfanas", async () => {
      const { storiesPayload } = setupForeignStories();
      let putRequests = 0;

      server.use(
        http.get("/api/stories/:username", () => HttpResponse.json({ data: storiesPayload })),
        http.put("/api/likes/story/:storyId", () => {
          putRequests += 1;
          return HttpResponse.json({ data: storiesPayload.stories[0] });
        })
      );

      renderStoriesPage(["/stories/ana_stories"]);
      expect(await screen.findByText("Historia de Ana")).toBeInTheDocument();

      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      fireEvent.click(screen.getByRole("button", { name: "Dar like a la historia" }));
      await flushZeroMs();
      expect(screen.getByRole("button", { name: "Eliminar like de la historia" })).toBeInTheDocument();

      // Cerrar el visor antes de que se cumplan los 250ms del debounce
      fireEvent.keyDown(document, { key: "Escape" });

      vi.useRealTimers();
      expect(await screen.findByTestId("home-route")).toBeInTheDocument();

      await new Promise((resolve) => setTimeout(resolve, 350));
      expect(putRequests).toBe(0);
    });
  });
});
