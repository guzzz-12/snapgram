import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import {
  useCreateStory,
  useToggleLikeStory,
  useMarkStoryAsSeen,
  useDeleteStory,
  useGetUserStories
} from "@/services/stories";
import { useCreatePublicationModal } from "@/hooks/useCreatePublicationModal";
import type { UserWithStories } from "@/types/global";
import { server } from "../mocks/server";
import {
  buildMockStory,
  buildMockUserWithStories
} from "../mocks/stories/factories";

/**
 * Suite de integración para los servicios y repositorio de historias
 * (`src/services/stories/*` y `src/repositories/storiesRepository.ts`).
 *
 * Propósito:
 *   Validar el ciclo de vida completo de las historias: creación multipart (texto e imagen)
 *   con cierre del modal global, alternancia de likes actualizando inmediatamente la caché
 *   de React Query, registro de vistas, eliminación y consulta filtrada por modo `all` o `single`.
 *
 * Qué evalúa y alcance (SUTs):
 *   - `useCreateStory` + `createStoryFn`: construcción exacta de `FormData` (`media`, `mediaType`,
 *     `content`, `backgroundColor`, `textColor`, `textBgColor`, `imageSize`) hacia
 *     `POST /api/stories/create`, guarda ante contenido y archivo vacíos, invalidación de
 *     `["stories"]`, cierre de `useCreatePublicationModal` y `toast.error` en fallos.
 *   - `useToggleLikeStory`: envío `PUT /api/likes/story/:storyId`, actualización inmediata de
 *     `likedBy` dentro de `["stories", username]` (agregar like, quitar solo el like del usuario
 *     actual, preservar otras historias y no fallar si `storyId` no está en caché), invalidación
 *     de `["stories", username]` y manejo de errores sin mutar la caché.
 *   - `useMarkStoryAsSeen`: envío `PUT /api/stories/seen/:storyId` y manejo de error.
 *   - `useDeleteStory`: envío `DELETE /api/stories/:storyId`, invalidación de `["stories"]`,
 *     estados `isSuccess`/`isError` y `toast.error` en fallos.
 *   - `useGetUserStories`: guarda `enabled: !!username`, envío de `type="all"` vs `type="single"`
 *     con `storyId` hacia `GET /api/stories/:username` y propagación de `error`.
 */
describe("storiesServices (useCreateStory, useToggleLikeStory, useMarkStoryAsSeen, useDeleteStory, useGetUserStories)", () => {
  let queryClient: QueryClient;

  const createWrapper = (client: QueryClient) => {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

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
    useCreatePublicationModal.setState({
      open: false,
      publicationType: null,
      isRepost: false,
      repostedPostId: null
    });
  });

  describe("useCreateStory", () => {
    it("envía FormData con mediaType='text' a POST /api/stories/create, invalida ['stories'] y cierra el modal global", async () => {
      useCreatePublicationModal.setState({
        open: true,
        publicationType: "story"
      });

      let capturedContentType: string | null = null;
      let capturedFields: Record<string, FormDataEntryValue | null> = {};

      server.use(
        http.post("/api/stories/create", async ({ request }) => {
          capturedContentType = request.headers.get("content-type");
          const formData = await request.formData();

          capturedFields = {
            media: formData.get("media"),
            mediaType: formData.get("mediaType"),
            content: formData.get("content"),
            backgroundColor: formData.get("backgroundColor"),
            textColor: formData.get("textColor"),
            textBgColor: formData.get("textBgColor"),
            imageSize: formData.get("imageSize")
          };

          return HttpResponse.json({
            data: buildMockStory({
              content: "Hola Snapgram",
              mediaType: "text"
            })
          });
        })
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "toast-id");

      const { result } = renderHook(
        () =>
          useCreateStory({
            storyTextContent: "Hola Snapgram",
            selectedImageFiles: [],
            selectdBgColor: { name: "blue", value: "#1d4ed8" },
            storyTextColor: "#fff",
            storyTextBgColor: "transparent",
            imageSize: "cover"
          }),
        { wrapper: createWrapper(queryClient) }
      );

      act(() => {
        result.current.createStory();
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledTimes(1);
      });

      expect(capturedContentType).toMatch(/multipart\/form-data/i);
      expect(capturedFields).toEqual({
        media: null,
        mediaType: "text",
        content: "Hola Snapgram",
        backgroundColor: "#1d4ed8",
        textColor: "#fff",
        textBgColor: "transparent",
        imageSize: "cover"
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["stories"] });
      expect(useCreatePublicationModal.getState().open).toBe(false);
      expect(useCreatePublicationModal.getState().publicationType).toBeNull();
      expect(toastErrorSpy).not.toHaveBeenCalled();
    });

    it("adjunta el archivo en 'media' y envía mediaType='image' cuando hay imagen seleccionada", async () => {
      useCreatePublicationModal.setState({
        open: true,
        publicationType: "story"
      });

      let capturedContentType: string | null = null;
      let capturedRawBody = "";

      server.use(
        http.post("/api/stories/create", async ({ request }) => {
          capturedContentType = request.headers.get("content-type");
          capturedRawBody = await request.text();

          return HttpResponse.json({
            data: buildMockStory({
              content: "Atardecer",
              mediaType: "image",
              imageSize: "contain"
            })
          });
        })
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const appendSpy = vi.spyOn(FormData.prototype, "append");
      const imageFile = new File(["binary-image-data"], "sunset.png", {
        type: "image/png"
      });

      const { result } = renderHook(
        () =>
          useCreateStory({
            storyTextContent: "Atardecer",
            selectedImageFiles: [imageFile],
            selectdBgColor: { name: "dark", value: "#0f172a" },
            storyTextColor: "#000",
            storyTextBgColor: "#fff",
            imageSize: "contain"
          }),
        { wrapper: createWrapper(queryClient) }
      );

      act(() => {
        result.current.createStory();
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledTimes(1);
      });

      expect(appendSpy).toHaveBeenCalledWith("media", imageFile);
      expect(capturedContentType).toMatch(/multipart\/form-data/i);
      expect(capturedRawBody).toMatch(/Content-Disposition: form-data; name="media"/);
      expect(capturedRawBody).toContain("Content-Type: image/png");
      expect(capturedRawBody).toMatch(/name="mediaType"\r?\n\r?\nimage\b/);
      expect(capturedRawBody).toMatch(/name="content"\r?\n\r?\nAtardecer\b/);
      expect(capturedRawBody).toMatch(/name="backgroundColor"\r?\n\r?\n#0f172a\b/);
      expect(capturedRawBody).toMatch(/name="textColor"\r?\n\r?\n#000\b/);
      expect(capturedRawBody).toMatch(/name="textBgColor"\r?\n\r?\n#fff\b/);
      expect(capturedRawBody).toMatch(/name="imageSize"\r?\n\r?\ncontain\b/);
      expect(useCreatePublicationModal.getState().open).toBe(false);
      expect(useCreatePublicationModal.getState().publicationType).toBeNull();
    });

    it("no envía ninguna petición HTTP si storyTextContent está vacío y no hay archivos seleccionados", async () => {
      let requestCount = 0;

      server.use(
        http.post("/api/stories/create", () => {
          requestCount += 1;
          return HttpResponse.json({ data: buildMockStory() });
        })
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(
        () =>
          useCreateStory({
            storyTextContent: "",
            selectedImageFiles: [],
            selectdBgColor: { name: "blue", value: "#1d4ed8" },
            storyTextColor: "#fff",
            storyTextBgColor: "transparent",
            imageSize: "cover"
          }),
        { wrapper: createWrapper(queryClient) }
      );

      act(() => {
        result.current.createStory();
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledTimes(1);
      });

      expect(requestCount).toBe(0);
    });

    it("muestra toast.error y mantiene el modal abierto sin invalidar ['stories'] si falla la creación", async () => {
      useCreatePublicationModal.setState({
        open: true,
        publicationType: "story"
      });

      server.use(
        http.post("/api/stories/create", () => {
          return HttpResponse.json(
            { message: "No se pudo publicar la historia" },
            { status: 500 }
          );
        })
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "toast-id");

      const { result } = renderHook(
        () =>
          useCreateStory({
            storyTextContent: "Historia con error",
            selectedImageFiles: [],
            selectdBgColor: { name: "blue", value: "#1d4ed8" },
            storyTextColor: "#fff",
            storyTextBgColor: "transparent",
            imageSize: "cover"
          }),
        { wrapper: createWrapper(queryClient) }
      );

      act(() => {
        result.current.createStory();
      });

      await waitFor(() => {
        expect(toastErrorSpy).toHaveBeenCalledTimes(1);
      });

      expect(toastErrorSpy).toHaveBeenCalledWith("No se pudo publicar la historia");
      expect(invalidateSpy).not.toHaveBeenCalled();
      expect(useCreatePublicationModal.getState().open).toBe(true);
      expect(useCreatePublicationModal.getState().publicationType).toBe("story");
    });
  });

  describe("useToggleLikeStory", () => {
    it("envía PUT /api/likes/story/:storyId, agrega el like al story objetivo en caché ['stories', username] sin alterar otras historias e invalida la query", async () => {
      const targetStory = buildMockStory({
        _id: "story_1",
        likedBy: [{ user: "other_user", likedAt: "2026-01-01T00:00:00.000Z" }]
      });
      const siblingStory = buildMockStory({
        _id: "story_2",
        likedBy: []
      });
      const cachedUserStories = buildMockUserWithStories({
        username: "maria_dev",
        stories: [targetStory, siblingStory]
      });

      queryClient.setQueryData(["stories", "maria_dev"], cachedUserStories);

      let capturedStoryId: string | undefined;
      server.use(
        http.put("/api/likes/story/:storyId", ({ params }) => {
          capturedStoryId = params.storyId as string;
          return HttpResponse.json({ data: targetStory });
        })
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(
        () => useToggleLikeStory("story_1", "maria_dev", "current_user_1"),
        { wrapper: createWrapper(queryClient) }
      );

      act(() => {
        result.current.toggleLikeStory();
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledTimes(1);
      });

      expect(capturedStoryId).toBe("story_1");
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["stories", "maria_dev"]
      });

      const updatedCache = queryClient.getQueryData<UserWithStories>([
        "stories",
        "maria_dev"
      ]);
      expect(updatedCache?.stories[0].likedBy).toHaveLength(2);
      expect(updatedCache?.stories[0].likedBy.map((l) => l.user)).toEqual([
        "other_user",
        "current_user_1"
      ]);
      expect(updatedCache?.stories[0].likedBy[1].likedAt).toBeInstanceOf(Date);
      expect(updatedCache?.stories[1].likedBy).toEqual([]);
    });

    it("quita únicamente el like del usuario actual en caché cuando la historia ya tenía su like", async () => {
      const targetStory = buildMockStory({
        _id: "story_1",
        likedBy: [
          { user: "other_user", likedAt: "2026-01-01T00:00:00.000Z" },
          { user: "current_user_1", likedAt: "2026-01-02T00:00:00.000Z" }
        ]
      });
      const cachedUserStories = buildMockUserWithStories({
        username: "maria_dev",
        stories: [targetStory]
      });

      queryClient.setQueryData(["stories", "maria_dev"], cachedUserStories);

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(
        () => useToggleLikeStory("story_1", "maria_dev", "current_user_1"),
        { wrapper: createWrapper(queryClient) }
      );

      act(() => {
        result.current.toggleLikeStory();
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledTimes(1);
      });

      const updatedCache = queryClient.getQueryData<UserWithStories>([
        "stories",
        "maria_dev"
      ]);
      expect(updatedCache?.stories[0].likedBy).toEqual([
        { user: "other_user", likedAt: "2026-01-01T00:00:00.000Z" }
      ]);
    });

    it("mantiene la caché intacta si el storyId no existe dentro de ['stories', username]", async () => {
      const existingStory = buildMockStory({
        _id: "story_existing",
        likedBy: [{ user: "other_user", likedAt: "2026-01-01T00:00:00.000Z" }]
      });
      const cachedUserStories = buildMockUserWithStories({
        username: "maria_dev",
        stories: [existingStory]
      });

      queryClient.setQueryData(["stories", "maria_dev"], cachedUserStories);

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(
        () => useToggleLikeStory("story_nonexistent", "maria_dev", "current_user_1"),
        { wrapper: createWrapper(queryClient) }
      );

      act(() => {
        result.current.toggleLikeStory();
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledTimes(1);
      });

      const updatedCache = queryClient.getQueryData<UserWithStories>([
        "stories",
        "maria_dev"
      ]);
      expect(updatedCache).toBe(cachedUserStories);
      expect(updatedCache?.stories[0].likedBy).toEqual([
        { user: "other_user", likedAt: "2026-01-01T00:00:00.000Z" }
      ]);
    });

    it("no modifica la caché ni invalida queries si falla PUT /api/likes/story/:storyId", async () => {
      const targetStory = buildMockStory({
        _id: "story_1",
        likedBy: []
      });
      const cachedUserStories = buildMockUserWithStories({
        username: "maria_dev",
        stories: [targetStory]
      });

      queryClient.setQueryData(["stories", "maria_dev"], cachedUserStories);

      server.use(
        http.put("/api/likes/story/:storyId", () => {
          return HttpResponse.json(
            { message: "Error en servidor" },
            { status: 500 }
          );
        })
      );

      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const setQueryDataSpy = vi.spyOn(queryClient, "setQueryData");
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(
        () => useToggleLikeStory("story_1", "maria_dev", "current_user_1"),
        { wrapper: createWrapper(queryClient) }
      );

      act(() => {
        result.current.toggleLikeStory();
      });

      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith(
          "Error alternando like en historia"
        );
      });

      expect(setQueryDataSpy).not.toHaveBeenCalled();
      expect(invalidateSpy).not.toHaveBeenCalled();
      expect(
        queryClient.getQueryData<UserWithStories>(["stories", "maria_dev"])
          ?.stories[0].likedBy
      ).toEqual([]);
    });
  });

  describe("useMarkStoryAsSeen", () => {
    it("envía PUT /api/stories/seen/:storyId con el storyId correcto", async () => {
      let capturedStoryId: string | undefined;
      let requestCount = 0;

      server.use(
        http.put("/api/stories/seen/:storyId", ({ params }) => {
          requestCount += 1;
          capturedStoryId = params.storyId as string;
          return HttpResponse.json({ message: "ok" });
        })
      );

      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const { result } = renderHook(() => useMarkStoryAsSeen("story_seen_42"), {
        wrapper: createWrapper(queryClient)
      });

      act(() => {
        result.current.markStoryAsSeen();
      });

      await waitFor(() => {
        expect(requestCount).toBe(1);
        expect(result.current.isMarkingStoryAsSeen).toBe(false);
      });

      expect(capturedStoryId).toBe("story_seen_42");
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it("registra el error en consola si falla PUT /api/stories/seen/:storyId", async () => {
      server.use(
        http.put("/api/stories/seen/:storyId", () => {
          return HttpResponse.json({ message: "Error interno" }, { status: 500 });
        })
      );

      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const { result } = renderHook(() => useMarkStoryAsSeen("story_seen_err"), {
        wrapper: createWrapper(queryClient)
      });

      act(() => {
        result.current.markStoryAsSeen();
      });

      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith("Error actualizando historia");
      });
    });
  });

  describe("useDeleteStory", () => {
    it("envía DELETE /api/stories/:storyId, invalida ['stories'] y expone isSuccess=true", async () => {
      let capturedStoryId: string | undefined;

      server.use(
        http.delete("/api/stories/:storyId", ({ params }) => {
          capturedStoryId = params.storyId as string;
          return HttpResponse.json({
            data: { message: "Historia eliminada" }
          });
        })
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "toast-id");

      const { result } = renderHook(() => useDeleteStory("story_del_7"), {
        wrapper: createWrapper(queryClient)
      });

      act(() => {
        result.current.deleteStory();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(capturedStoryId).toBe("story_del_7");
      expect(result.current.isError).toBe(false);
      expect(invalidateSpy).toHaveBeenCalledTimes(1);
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["stories"] });
      expect(toastErrorSpy).not.toHaveBeenCalled();
    });

    it("muestra toast.error, marca isError=true y no invalida ['stories'] si falla DELETE /api/stories/:storyId", async () => {
      server.use(
        http.delete("/api/stories/:storyId", () => {
          return HttpResponse.json(
            { message: "No tienes permiso para eliminar esta historia" },
            { status: 403 }
          );
        })
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "toast-id");

      const { result } = renderHook(() => useDeleteStory("story_del_forbidden"), {
        wrapper: createWrapper(queryClient)
      });

      act(() => {
        result.current.deleteStory();
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.isSuccess).toBe(false);
      expect(toastErrorSpy).toHaveBeenCalledTimes(1);
      expect(toastErrorSpy).toHaveBeenCalledWith(
        "No tienes permiso para eliminar esta historia"
      );
      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });

  describe("useGetUserStories", () => {
    it("permanece inactiva y no dispara GET /api/stories/:username si username es null", async () => {
      let requestCount = 0;

      server.use(
        http.get("/api/stories/:username", () => {
          requestCount += 1;
          return HttpResponse.json({ data: buildMockUserWithStories() });
        })
      );

      const { result } = renderHook(() => useGetUserStories(null), {
        wrapper: createWrapper(queryClient)
      });

      await new Promise((resolve) => setTimeout(resolve, 30));

      expect(requestCount).toBe(0);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.data).toBeUndefined();
    });

    it("consulta GET /api/stories/:username con type='all' cuando no se proporciona storyId", async () => {
      const storiesPayload = buildMockUserWithStories({
        username: "maria_dev",
        stories: [
          buildMockStory({ _id: "st_1", content: "Primera" }),
          buildMockStory({ _id: "st_2", content: "Segunda" })
        ]
      });

      let capturedUsername: string | undefined;
      let capturedType: string | null = null;
      let capturedStoryId: string | null = null;

      server.use(
        http.get("/api/stories/:username", ({ params, request }) => {
          capturedUsername = params.username as string;
          const url = new URL(request.url);
          capturedType = url.searchParams.get("type");
          capturedStoryId = url.searchParams.get("storyId");

          return HttpResponse.json({ data: storiesPayload });
        })
      );

      const { result } = renderHook(() => useGetUserStories("maria_dev"), {
        wrapper: createWrapper(queryClient)
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(capturedUsername).toBe("maria_dev");
      expect(capturedType).toBe("all");
      expect(capturedStoryId).toBeNull();
      expect(result.current.data).toEqual(storiesPayload);
      expect(result.current.data?.stories).toHaveLength(2);
    });

    it("consulta GET /api/stories/:username con type='single' y storyId cuando se proporciona un storyId", async () => {
      const singleStoryPayload = buildMockUserWithStories({
        username: "maria_dev",
        stories: [buildMockStory({ _id: "story_single_9", content: "Única" })]
      });

      let capturedType: string | null = null;
      let capturedStoryId: string | null = null;

      server.use(
        http.get("/api/stories/:username", ({ request }) => {
          const url = new URL(request.url);
          capturedType = url.searchParams.get("type");
          capturedStoryId = url.searchParams.get("storyId");

          return HttpResponse.json({ data: singleStoryPayload });
        })
      );

      const { result } = renderHook(
        () => useGetUserStories("maria_dev", "story_single_9"),
        { wrapper: createWrapper(queryClient) }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(capturedType).toBe("single");
      expect(capturedStoryId).toBe("story_single_9");
      expect(result.current.data).toEqual(singleStoryPayload);
    });

    it("expone error cuando falla GET /api/stories/:username", async () => {
      server.use(
        http.get("/api/stories/:username", () => {
          return HttpResponse.json(
            { message: "Usuario no encontrado" },
            { status: 404 }
          );
        })
      );

      const { result } = renderHook(() => useGetUserStories("inexistente"), {
        wrapper: createWrapper(queryClient)
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.isSuccess).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });
});
