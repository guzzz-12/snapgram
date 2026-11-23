import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, type InitialEntry } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import StoriesViewer from "@/components/stories/StoriesViewer";
import { AuthContext, type AuthContext as AuthContextType } from "@/providers/AuthProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { UserType } from "@/types/global";
import { server } from "../../mocks/server";
import { buildMockUser } from "../../mocks/users/factories";
import {
  buildMockStory,
  buildMockUserWithStories
} from "../../mocks/stories/factories";

/**
 * Suite de integración para el visor interactivo de historias
 * (`src/components/stories/StoriesViewer.tsx` y `src/components/stories/StoryProgressBar.tsx`).
 *
 * Propósito:
 *   Validar la reproducción temporizada con barras de progreso, la navegación manual y
 *   automática entre historias, la pausa/reanudación, el registro de vistas únicamente para
 *   espectadores, los permisos diferenciados de autor vs espectador (likes, `SeenByUsers` y
 *   eliminación con `DeleteStoryModal`), y la redirección cuando no hay historias activas.
 *
 * Qué evalúa y alcance (SUTs):
 *   - Carga, navegación y vistas (`StoriesViewer`): skeleton inicial, primera historia activa,
 *     navegación anterior/siguiente actualizando barras `seenStories` (`scaleX(1)` / `scaleX(0)`)
 *     y estados `disabled` en extremos, más llamada automática a `PUT /api/stories/seen/:storyId`
 *     solo cuando el usuario actual no es el autor.
 *   - Permisos de autor: muestra `<SeenByUsers />` (`"Vista por N"`), menú `"Opciones de la historia"`
 *     → `"Eliminar historia"` (`DeleteStoryModal`), pausa al abrir el modal, elimina vía
 *     `DELETE /api/stories/:storyId`, avanza a la historia restante y oculta el botón de like.
 *   - Permisos de espectador: oculta `<SeenByUsers />` y opciones de borrado, y permite alternar
 *     like/unlike vía `PUT /api/likes/story/:storyId` actualizando inmediatamente el botón.
 *   - `StoryProgressBar` + Play/Pause: avanza progreso con `requestAnimationFrame`, detiene el
 *     avance al pausar, reanuda acumulando el tiempo transcurrido para avanzar automáticamente a
 *     la siguiente historia y redirige a `"/"` al finalizar la última.
 *   - Redirección, query `?storyId=` y errores: redirige a `"/"` si `!userWithStories`, consulta
 *     `type=single&storyId=...` ocultando flechas cuando hay 1 historia, y muestra `toast.error`
 *     en fallos de API.
 */
describe("StoriesViewer y StoryProgressBar", () => {
  let queryClient: QueryClient;

  const authorUser = buildMockUser({
    _id: "usr_author_1",
    clerkId: "clerk_author_1",
    fullName: "Elena Autora",
    username: "elena_stories"
  });

  const viewerUser = buildMockUser({
    _id: "usr_viewer_2",
    clerkId: "clerk_viewer_2",
    fullName: "Mateo Espectador",
    username: "mateo_v"
  });

  const renderViewer = ({
    storiesUsername = authorUser.username,
    loggedUser = viewerUser,
    initialEntries = [`/stories/${storiesUsername}`]
  }: {
    storiesUsername?: string | null;
    loggedUser?: UserType;
    initialEntries?: InitialEntry[];
  } = {}) => {
    useCurrentUser.setState({ user: loggedUser, loadingUser: false });

    const authValue: AuthContextType = {
      userId: loggedUser.clerkId,
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
              <Route
                path="/stories/:username"
                element={<StoriesViewer storiesUsername={storiesUsername} />}
              />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  };

  const getPrevButton = (container: HTMLElement): HTMLButtonElement | null =>
    (container
      .querySelector(".lucide-circle-chevron-left")
      ?.closest("button") as HTMLButtonElement | null) ?? null;

  const getNextButton = (container: HTMLElement): HTMLButtonElement | null =>
    (container
      .querySelector(".lucide-circle-chevron-right")
      ?.closest("button") as HTMLButtonElement | null) ?? null;

  const getPauseOrPlayButton = (container: HTMLElement) =>
    (container.querySelector(".lucide-pause") ??
      container.querySelector(".lucide-play"))?.closest(
      "button"
    ) as HTMLButtonElement | null;

  const getProgressInnerBars = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('[role="progressbar"] > div')) as HTMLDivElement[];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    useCurrentUser.setState({ user: null, loadingUser: false });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    queryClient.clear();
    useCurrentUser.setState({ user: null, loadingUser: false });
  });

  describe("carga, navegación manual y marcado automático de vistas", () => {
    it("muestra skeleton al cargar, navega entre historias actualizando seenStories y marca cada vista en el backend para un espectador", async () => {
      const user = userEvent.setup();
      const markedSeenIds: string[] = [];

      let releaseStories!: () => void;
      const storiesGate = new Promise<void>((resolve) => {
        releaseStories = resolve;
      });

      const storiesPayload = buildMockUserWithStories({
        _id: authorUser._id,
        clerkId: authorUser.clerkId,
        fullName: authorUser.fullName,
        username: authorUser.username,
        stories: [
          buildMockStory({ _id: "st_1", user: authorUser, content: "Historia uno" }),
          buildMockStory({ _id: "st_2", user: authorUser, content: "Historia dos" }),
          buildMockStory({ _id: "st_3", user: authorUser, content: "Historia tres" })
        ]
      });

      server.use(
        http.get("/api/stories/:username", async () => {
          await storiesGate;
          return HttpResponse.json({ data: storiesPayload });
        }),
        http.put("/api/stories/seen/:storyId", ({ params }) => {
          markedSeenIds.push(params.storyId as string);
          return HttpResponse.json({ message: "ok" });
        })
      );

      const { container } = renderViewer({ loggedUser: viewerUser });

      // Skeleton visible mientras carga
      expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();

      act(() => {
        releaseStories();
      });

      // Historia 1 activa, prev deshabilitado, next habilitado y marcada como vista
      expect(await screen.findByText("Historia uno")).toBeInTheDocument();
      await waitFor(() => {
        expect(markedSeenIds).toEqual(["st_1"]);
      });

      expect(screen.getAllByRole("progressbar")).toHaveLength(3);
      expect(getPrevButton(container)).toBeDisabled();
      expect(getNextButton(container)).toBeEnabled();

      // Avanzar a Historia 2
      await user.click(getNextButton(container)!);
      expect(await screen.findByText("Historia dos")).toBeInTheDocument();
      await waitFor(() => {
        expect(markedSeenIds).toEqual(["st_1", "st_2"]);
      });

      const barsAtSecond = getProgressInnerBars(container);
      expect(barsAtSecond[0].style.transform).toBe("scaleX(1)");
      expect(barsAtSecond[2].style.transform).toBe("scaleX(0)");
      expect(getPrevButton(container)).toBeEnabled();
      expect(getNextButton(container)).toBeEnabled();

      // Avanzar a Historia 3 (última) -> next deshabilitado
      await user.click(getNextButton(container)!);
      expect(await screen.findByText("Historia tres")).toBeInTheDocument();
      await waitFor(() => {
        expect(markedSeenIds).toEqual(["st_1", "st_2", "st_3"]);
      });
      expect(getNextButton(container)).toBeDisabled();

      // Retroceder a Historia 2 -> Historia 3 deja de figurar como vista (scaleX(0))
      await user.click(getPrevButton(container)!);
      expect(await screen.findByText("Historia dos")).toBeInTheDocument();
      expect(getProgressInnerBars(container)[2].style.transform).toBe("scaleX(0)");
    });

    it("NO llama a useMarkStoryAsSeen cuando el usuario actual es el autor de la historia", async () => {
      let seenCalls = 0;

      const storiesPayload = buildMockUserWithStories({
        _id: authorUser._id,
        clerkId: authorUser.clerkId,
        fullName: authorUser.fullName,
        username: authorUser.username,
        stories: [
          buildMockStory({ _id: "st_own_1", user: authorUser, content: "Mi propia historia" })
        ]
      });

      server.use(
        http.get("/api/stories/:username", () => HttpResponse.json({ data: storiesPayload })),
        http.put("/api/stories/seen/:storyId", () => {
          seenCalls += 1;
          return HttpResponse.json({ message: "ok" });
        })
      );

      renderViewer({ loggedUser: authorUser });

      expect(await screen.findByText("Mi propia historia")).toBeInTheDocument();
      await new Promise((resolve) => setTimeout(resolve, 30));

      expect(seenCalls).toBe(0);
    });
  });

  describe("permisos de autor vs espectador", () => {
    it("para el autor muestra SeenByUsers, oculta el botón de like y permite eliminar la historia pasando a la restante", async () => {
      const user = userEvent.setup();
      const deletedIds: string[] = [];

      const viewerA = buildMockUser({
        _id: "usr_va",
        clerkId: "clerk_va",
        fullName: "Ana Vista"
      });
      const viewerB = buildMockUser({
        _id: "usr_vb",
        clerkId: "clerk_vb",
        fullName: "Beto Vista"
      });

      let currentStories = [
        buildMockStory({
          _id: "st_del_1",
          user: authorUser,
          content: "Historia por eliminar",
          seenBy: [
            { user: viewerA, seenAt: "2026-11-23T10:00:00.000Z" },
            { user: viewerB, seenAt: "2026-11-23T10:05:00.000Z" }
          ]
        }),
        buildMockStory({
          _id: "st_keep_2",
          user: authorUser,
          content: "Historia sobreviviente",
          seenBy: []
        })
      ];

      server.use(
        http.get("/api/stories/:username", () =>
          HttpResponse.json({
            data: buildMockUserWithStories({
              _id: authorUser._id,
              clerkId: authorUser.clerkId,
              fullName: authorUser.fullName,
              username: authorUser.username,
              stories: currentStories
            })
          })
        ),
        http.delete("/api/stories/:storyId", ({ params }) => {
          const id = params.storyId as string;
          deletedIds.push(id);
          currentStories = currentStories.filter((s) => s._id !== id);
          return HttpResponse.json({ data: { message: "Eliminada" } });
        })
      );

      const { container } = renderViewer({ loggedUser: authorUser });

      expect(await screen.findByText("Historia por eliminar")).toBeInTheDocument();
      expect(screen.getByText("Vista por 2")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /like/i })
      ).not.toBeInTheDocument();

      // Abrir menú de opciones y DeleteStoryModal (pausa el temporizador al abrirse)
      await user.click(screen.getByRole("button", { name: "Opciones de la historia" }));
      await user.click(
        await screen.findByRole("menuitem", { name: "Eliminar historia" })
      );

      expect(await screen.findByRole("dialog")).toBeInTheDocument();
      expect(container.querySelector(".lucide-play")).toBeInTheDocument();

      // Confirmar eliminación -> DELETE /api/stories/st_del_1 y muestra historia restante
      await user.click(screen.getByRole("button", { name: "Eliminar" }));

      expect(await screen.findByText("Historia sobreviviente")).toBeInTheDocument();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(deletedIds).toEqual(["st_del_1"]);
    });

    it("para el espectador oculta SeenByUsers y opciones de borrado, y permite alternar like/unlike", async () => {
      const user = userEvent.setup();
      let likeRequests = 0;

      let storyLikedBy: { user: string; likedAt: string }[] = [];

      server.use(
        http.get("/api/stories/:username", () =>
          HttpResponse.json({
            data: buildMockUserWithStories({
              _id: authorUser._id,
              clerkId: authorUser.clerkId,
              fullName: authorUser.fullName,
              username: authorUser.username,
              stories: [
                buildMockStory({
                  _id: "st_like_1",
                  user: authorUser,
                  content: "Historia con likes",
                  seenBy: [{ user: viewerUser, seenAt: "2026-11-23T10:00:00.000Z" }],
                  likedBy: storyLikedBy
                })
              ]
            })
          })
        ),
        http.put("/api/likes/story/:storyId", ({ params }) => {
          expect(params.storyId).toBe("st_like_1");
          likeRequests += 1;
          const alreadyLiked = storyLikedBy.some((l) => l.user === viewerUser._id);
          storyLikedBy = alreadyLiked
            ? []
            : [{ user: viewerUser._id, likedAt: new Date().toISOString() }];

          return HttpResponse.json({
            data: buildMockStory({ _id: "st_like_1", likedBy: storyLikedBy })
          });
        })
      );

      renderViewer({ loggedUser: viewerUser });

      expect(await screen.findByText("Historia con likes")).toBeInTheDocument();

      expect(screen.queryByText(/Vista por/i)).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Opciones de la historia" })
      ).not.toBeInTheDocument();

      // Dar like (actualización optimista inmediata + petición debounced)
      const likeBtn = screen.getByRole("button", { name: "Dar like a la historia" });
      await user.click(likeBtn);

      expect(
        await screen.findByRole("button", { name: "Eliminar like de la historia" })
      ).toBeInTheDocument();
      await waitFor(() => {
        expect(likeRequests).toBe(1);
      });

      // Quitar like
      await user.click(
        screen.getByRole("button", { name: "Eliminar like de la historia" })
      );

      expect(
        await screen.findByRole("button", { name: "Dar like a la historia" })
      ).toBeInTheDocument();
      await waitFor(() => {
        expect(likeRequests).toBe(2);
      });
    });
  });

  describe("pausa, reanudación y avance automático en StoryProgressBar", () => {
    it("detiene el avance automático al pausar, reanuda desde el tiempo acumulado para pasar a la siguiente historia y redirige a '/' al concluir la última", async () => {
      vi.useFakeTimers({
        toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"]
      });

      const user = userEvent.setup();

      const storiesPayload = buildMockUserWithStories({
        _id: authorUser._id,
        clerkId: authorUser.clerkId,
        fullName: authorUser.fullName,
        username: authorUser.username,
        stories: [
          buildMockStory({ _id: "st_auto_1", user: authorUser, content: "Primera auto" }),
          buildMockStory({ _id: "st_auto_2", user: authorUser, content: "Segunda auto" })
        ]
      });

      server.use(
        http.get("/api/stories/:username", () => HttpResponse.json({ data: storiesPayload }))
      );

      const { container } = renderViewer({ loggedUser: authorUser });

      expect(await screen.findByText("Primera auto")).toBeInTheDocument();

      // Avanzar 4 segundos (40% de los 10s): sigue en la primera historia con progreso intermedio
      act(() => {
        vi.advanceTimersByTime(4000);
      });

      expect(screen.getByText("Primera auto")).toBeInTheDocument();
      expect(getProgressInnerBars(container)[0].style.transform).toMatch(
        /^scaleX\(0\.3|0\.4/
      );

      // Pausar reproducción: el ícono cambia a Play y no avanza incluso tras 15s
      const pauseBtn = getPauseOrPlayButton(container)!;
      expect(container.querySelector(".lucide-pause")).toBeInTheDocument();
      await user.click(pauseBtn);
      expect(container.querySelector(".lucide-play")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(15000);
      });

      expect(screen.getByText("Primera auto")).toBeInTheDocument();
      expect(screen.queryByText("Segunda auto")).not.toBeInTheDocument();

      // Reanudar reproducción: solo necesita ~6s restantes para completar los 10s y avanzar
      await user.click(getPauseOrPlayButton(container)!);
      expect(container.querySelector(".lucide-pause")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(6200);
      });

      expect(await screen.findByText("Segunda auto")).toBeInTheDocument();
      expect(getProgressInnerBars(container)[0].style.transform).toBe("scaleX(1)");

      // Al completar los 10s de la última historia navega automáticamente a "/"
      act(() => {
        vi.advanceTimersByTime(10200);
      });

      expect(await screen.findByTestId("home-route")).toBeInTheDocument();
    });
  });

  describe("redirección sin historias, modo single y errores de API", () => {
    it("redirige a '/' cuando el usuario no tiene historias activas (data: null)", async () => {
      server.use(
        http.get("/api/stories/:username", () => HttpResponse.json({ data: null }))
      );

      renderViewer({ loggedUser: viewerUser });

      expect(await screen.findByTestId("home-route")).toBeInTheDocument();
    });

    it("consulta type='single' cuando la URL incluye ?storyId=... y oculta las flechas de navegación si solo hay 1 historia", async () => {
      let capturedType: string | null = null;
      let capturedStoryId: string | null = null;

      server.use(
        http.get("/api/stories/:username", ({ request }) => {
          const url = new URL(request.url);
          capturedType = url.searchParams.get("type");
          capturedStoryId = url.searchParams.get("storyId");

          return HttpResponse.json({
            data: buildMockUserWithStories({
              _id: authorUser._id,
              clerkId: authorUser.clerkId,
              username: authorUser.username,
              stories: [
                buildMockStory({
                  _id: "st_only_99",
                  user: authorUser,
                  content: "Historia individual"
                })
              ]
            })
          });
        })
      );

      const { container } = renderViewer({
        loggedUser: authorUser,
        initialEntries: [`/stories/${authorUser.username}?storyId=st_only_99`]
      });

      expect(await screen.findByText("Historia individual")).toBeInTheDocument();
      expect(capturedType).toBe("single");
      expect(capturedStoryId).toBe("st_only_99");
      expect(getPrevButton(container)).toBeNull();
      expect(getNextButton(container)).toBeNull();
    });

    it("muestra toast.error con el mensaje del servidor si falla GET /api/stories/:username", async () => {
      server.use(
        http.get("/api/stories/:username", () =>
          HttpResponse.json(
            { message: "Error al cargar historias" },
            { status: 500 }
          )
        )
      );

      const toastErrorSpy = vi
        .spyOn(toast, "error")
        .mockImplementation(() => "toast-id");

      renderViewer({ loggedUser: viewerUser });

      await waitFor(() => {
        expect(toastErrorSpy).toHaveBeenCalledWith("Error al cargar historias");
      });
    });
  });
});
