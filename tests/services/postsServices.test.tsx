import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router";
import { QueryClient, QueryClientProvider, type InfiniteData } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import {
  useCreatePost,
  useEditPost,
  useDeletePost,
  useSharePost,
  useGetFeedPosts,
  useGetPostById
} from "@/services/posts";
import { filesUploader } from "@/utils/filesUploader";
import { server } from "../mocks/server";
import { buildMockPostWithLikes } from "../mocks/posts/factories";
import { mockPostsDb } from "../mocks/posts/postsRepository";
import { buildMockUser } from "../mocks/users/factories";
import type { PostWithLikes } from "@/types/global";

vi.mock("@/utils/filesUploader", () => ({
  filesUploader: vi.fn()
}));

type PaginatedPostsPage = {
  data: PostWithLikes[];
  hasMore: boolean;
  nextPage: number | null;
};

/**
 * Suite de integración para los servicios y repositorio de publicaciones
 * (`src/services/posts/*` y `src/repositories/postsRepository.ts`).
 *
 * Propósito:
 *   Verificar el comportamiento de consulta, paginación infinita, creación (texto e imágenes),
 *   repost, edición en caché sin re-descarga del feed, eliminación con redirección contextual
 *   y manejo de errores de cada hook de publicaciones.
 *
 * Qué evalúa y alcance (SUTs):
 *   - `useCreatePost` + `createPostFn`: subida previa con `filesUploader`, payload enviado a `POST /api/posts`,
 *     validación de usuario/contenido vacío, invalidación condicional de búsqueda y callback `onError(err, "create")`.
 *   - `useSharePost`: repost hacia `POST /api/posts/share/:id`, guarda sin ID, invalidación de `["posts"]`
 *     y callback `onError(err, "share")`.
 *   - `useEditPost`: `PUT /api/posts/:id`, actualización in-place en `["posts"]`, `["posts", clerkId]`,
 *     `["likes", "likedPosts"]` y `["posts", postId]` sin invalidar el feed, invalidación condicional de búsqueda y toast de error.
 *   - `useDeletePost`: `DELETE /api/posts/:id`, redirección con `replace: true` desde `/post/:id` vs invalidación
 *     de queries desde otras rutas, y manejo de errores con `toast.error`.
 *   - `useGetFeedPosts` + `fetchPosts`: paginación infinita (`limit=5`), estabilidad referencial de `posts` (`useMemo`) y errores.
 *   - `useGetPostById` + `getPost`: deshabilitación sin `postId`, desempaquetado de `data.data` y política `retry: 1`.
 */
describe("postsServices (useCreatePost, useSharePost, useEditPost, useDeletePost, useGetFeedPosts, useGetPostById)", () => {
  let queryClient: QueryClient;
  const mockFilesUploader = vi.mocked(filesUploader);

  const createWrapper = (
    client: QueryClient,
    initialEntries: string[] = ["/"]
  ) => {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    mockPostsDb.clear();
    mockFilesUploader.mockReset();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    queryClient.clear();
  });

  describe("useCreatePost & createPostFn", () => {
    it("crea un post de texto e invalida ['posts'] y ['search', searchTerm, 'posts'] sin invocar filesUploader", async () => {
      const user = buildMockUser();
      let capturedBody: { content: string; imageUrls: string[]; imageFileIds: string[] } | null = null;

      server.use(
        http.post("/api/posts", async ({ request }) => {
          capturedBody = (await request.json()) as {
            content: string;
            imageUrls: string[];
            imageFileIds: string[];
          };
          return HttpResponse.json({
            data: buildMockPostWithLikes({ content: capturedBody.content })
          });
        })
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const onSuccess = vi.fn();
      const onError = vi.fn();

      const { result } = renderHook(() => useCreatePost(), {
        wrapper: createWrapper(queryClient)
      });

      act(() => {
        result.current.mutate({
          user,
          searchTerm: "typescript",
          fileInputRef: { current: null },
          textContent: "Publicación de prueba #typescript",
          selectedImageFiles: [],
          onSuccess,
          onError
        });
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });

      expect(mockFilesUploader).not.toHaveBeenCalled();
      expect(capturedBody).toEqual({
        content: "Publicación de prueba #typescript",
        imageUrls: [],
        imageFileIds: []
      });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["posts"] });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["search", "typescript", "posts"]
      });
      expect(onError).not.toHaveBeenCalled();
    });

    it("sube imágenes con filesUploader antes de enviar POST /api/posts y no invalida búsqueda si searchTerm es null", async () => {
      const user = buildMockUser({ _id: "user_img_99" });
      const imageFile = new File(["img"], "photo.webp", { type: "image/webp" });
      let capturedBody: { content: string; imageUrls: string[]; imageFileIds: string[] } | null = null;

      mockFilesUploader.mockResolvedValueOnce([
        { fileUrl: "https://ik.imagekit.io/snapgram/pic1.webp", fileId: "ik_1" }
      ]);

      server.use(
        http.post("/api/posts", async ({ request }) => {
          capturedBody = (await request.json()) as {
            content: string;
            imageUrls: string[];
            imageFileIds: string[];
          };
          return HttpResponse.json({
            data: buildMockPostWithLikes({
              content: capturedBody.content,
              imageUrls: capturedBody.imageUrls
            })
          });
        })
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const onSuccess = vi.fn();
      const onError = vi.fn();

      const { result } = renderHook(() => useCreatePost(), {
        wrapper: createWrapper(queryClient)
      });

      act(() => {
        result.current.mutate({
          user,
          searchTerm: null,
          fileInputRef: { current: null },
          textContent: "Foto del día",
          selectedImageFiles: [imageFile],
          onSuccess,
          onError
        });
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });

      expect(mockFilesUploader).toHaveBeenCalledTimes(1);
      expect(mockFilesUploader).toHaveBeenCalledWith({
        files: [imageFile],
        folderName: "/posts/user_img_99",
        currentUser: user
      });
      expect(capturedBody).toEqual({
        content: "Foto del día",
        imageUrls: ["https://ik.imagekit.io/snapgram/pic1.webp"],
        imageFileIds: ["ik_1"]
      });
      expect(invalidateSpy).toHaveBeenCalledTimes(1);
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["posts"] });
    });

    it("no envía petición de red si el usuario es null o si no hay texto ni imágenes", async () => {
      const postRequestSpy = vi.fn();
      server.use(
        http.post("/api/posts", () => {
          postRequestSpy();
          return HttpResponse.json({ data: buildMockPostWithLikes() });
        })
      );

      const onSuccess = vi.fn();
      const onError = vi.fn();

      const { result } = renderHook(() => useCreatePost(), {
        wrapper: createWrapper(queryClient)
      });

      // 1. Usuario null
      act(() => {
        result.current.mutate({
          user: null,
          searchTerm: null,
          fileInputRef: { current: null },
          textContent: "Texto válido",
          selectedImageFiles: [],
          onSuccess,
          onError
        });
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });

      // 2. Contenido vacío y sin archivos
      act(() => {
        result.current.mutate({
          user: buildMockUser(),
          searchTerm: null,
          fileInputRef: { current: null },
          textContent: "",
          selectedImageFiles: [],
          onSuccess,
          onError
        });
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(2);
      });

      expect(mockFilesUploader).not.toHaveBeenCalled();
      expect(postRequestSpy).not.toHaveBeenCalled();
    });

    it("invoca onError(error, 'create') sin invalidar cachés cuando falla la API o la subida de archivos", async () => {
      const user = buildMockUser();
      const onSuccess = vi.fn();
      const onError = vi.fn();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      server.use(
        http.post("/api/posts", () => {
          return HttpResponse.json(
            { message: "Error al crear el post" },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useCreatePost(), {
        wrapper: createWrapper(queryClient)
      });

      // 1. Error HTTP 500
      act(() => {
        result.current.mutate({
          user,
          searchTerm: "react",
          fileInputRef: { current: null },
          textContent: "Post fallido",
          selectedImageFiles: [],
          onSuccess,
          onError
        });
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalledTimes(1);
      });

      expect(onError).toHaveBeenLastCalledWith(expect.any(Error), "create");
      expect(onSuccess).not.toHaveBeenCalled();
      expect(invalidateSpy).not.toHaveBeenCalled();

      // 2. Error en subida de archivos (filesUploader rechaza)
      const postRequestSpy = vi.fn();
      server.use(
        http.post("/api/posts", () => {
          postRequestSpy();
          return HttpResponse.json({ data: buildMockPostWithLikes() });
        })
      );
      mockFilesUploader.mockRejectedValueOnce(new Error("Error subiendo imagen"));

      act(() => {
        result.current.mutate({
          user,
          searchTerm: "react",
          fileInputRef: { current: null },
          textContent: "Post con imagen fallida",
          selectedImageFiles: [new File(["img"], "fail.webp", { type: "image/webp" })],
          onSuccess,
          onError
        });
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalledTimes(2);
      });

      expect(onError).toHaveBeenLastCalledWith(
        expect.objectContaining({ message: "Error subiendo imagen" }),
        "create"
      );
      expect(postRequestSpy).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });

  describe("useSharePost", () => {
    it("envía POST /api/posts/share/:id con el contenido, invalida ['posts'] y ejecuta onSuccess", async () => {
      let capturedUrlParam: string | undefined;
      let capturedBody: { content: string } | null = null;

      server.use(
        http.post("/api/posts/share/:postId", async ({ params, request }) => {
          capturedUrlParam = params.postId as string;
          capturedBody = (await request.json()) as { content: string };
          return HttpResponse.json({
            data: buildMockPostWithLikes({ postType: "repost", content: capturedBody.content })
          });
        })
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const onSuccess = vi.fn();
      const onError = vi.fn();

      const { result } = renderHook(() => useSharePost(), {
        wrapper: createWrapper(queryClient)
      });

      act(() => {
        result.current.repostMutation({
          repostedPostId: "post_orig_42",
          textContent: "Totalmente de acuerdo",
          onSuccess,
          onError
        });
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });

      expect(capturedUrlParam).toBe("post_orig_42");
      expect(capturedBody).toEqual({ content: "Totalmente de acuerdo" });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["posts"] });
      expect(onError).not.toHaveBeenCalled();
    });

    it("no realiza petición HTTP si repostedPostId está vacío", async () => {
      const shareSpy = vi.fn();
      const onSuccess = vi.fn();
      const onError = vi.fn();

      server.use(
        http.post("/api/posts/share/:postId", () => {
          shareSpy();
          return HttpResponse.json({ data: buildMockPostWithLikes() });
        })
      );

      const { result } = renderHook(() => useSharePost(), {
        wrapper: createWrapper(queryClient)
      });

      act(() => {
        result.current.repostMutation({
          repostedPostId: "",
          textContent: "Comentario",
          onSuccess,
          onError
        });
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });

      expect(shareSpy).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it("invoca onError(error, 'share') y expone repostError sin invalidar cachés cuando falla POST /api/posts/share/:id", async () => {
      const shareSpy = vi.fn();
      const onSuccess = vi.fn();
      const onError = vi.fn();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      server.use(
        http.post("/api/posts/share/:postId", () => {
          shareSpy();
          return HttpResponse.json(
            { message: "No se pudo compartir la publicación" },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useSharePost(), {
        wrapper: createWrapper(queryClient)
      });

      act(() => {
        result.current.repostMutation({
          repostedPostId: "post_orig_42",
          textContent: "Comentario",
          onSuccess,
          onError
        });
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalledTimes(1);
      });

      expect(shareSpy).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(expect.any(Error), "share");
      expect(result.current.repostError).toBeTruthy();
      expect(onSuccess).not.toHaveBeenCalled();
      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });

  describe("useEditPost", () => {
    it("envía PUT /api/posts/:id y actualiza in-place el contenido en ['posts'], ['likes', 'likedPosts'] y ['posts', postId] sin invalidar el feed", async () => {
      const targetPost = buildMockPostWithLikes({ _id: "post_edit_1", content: "Texto original" });
      const untouchedPost = buildMockPostWithLikes({ _id: "post_other_2", content: "Otro post" });

      const paginatedData: InfiniteData<PaginatedPostsPage> = {
        pages: [
          {
            data: [targetPost, untouchedPost],
            hasMore: false,
            nextPage: null
          }
        ],
        pageParams: [1]
      };

      queryClient.setQueryData(["posts"], paginatedData);
      queryClient.setQueryData(["posts", "clerk_user_1"], paginatedData);
      queryClient.setQueryData(["likes", "likedPosts"], paginatedData);
      queryClient.setQueryData<PostWithLikes>(["posts", targetPost._id], targetPost);

      let capturedPayload: { content: string } | null = null;
      server.use(
        http.put("/api/posts/:postId", async ({ params, request }) => {
          capturedPayload = (await request.json()) as { content: string };
          expect(params.postId).toBe(targetPost._id);
          return HttpResponse.json({
            data: {
              ...targetPost,
              content: "Texto editado desde servidor"
            }
          });
        })
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const onSuccess = vi.fn();

      const { result } = renderHook(() => useEditPost(), {
        wrapper: createWrapper(queryClient)
      });

      act(() => {
        result.current.mutate({
          postData: targetPost,
          updatedTextContent: "Texto editado por usuario",
          searchTerm: "react",
          onSuccess
        });
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });

      expect(capturedPayload).toEqual({ content: "Texto editado por usuario" });

      // El contenido en todas las cachés debe actualizarse con el contenido devuelto por el servidor
      const feedCache = queryClient.getQueryData<InfiniteData<PaginatedPostsPage>>(["posts"])!;
      const profileCache = queryClient.getQueryData<InfiniteData<PaginatedPostsPage>>([
        "posts",
        "clerk_user_1"
      ])!;
      const likedCache = queryClient.getQueryData<InfiniteData<PaginatedPostsPage>>([
        "likes",
        "likedPosts"
      ])!;
      const detailCache = queryClient.getQueryData<PostWithLikes>(["posts", targetPost._id])!;

      expect(feedCache.pages[0].data[0].content).toBe("Texto editado desde servidor");
      expect(feedCache.pages[0].data[1].content).toBe("Otro post");
      expect(profileCache.pages[0].data[0].content).toBe("Texto editado desde servidor");
      expect(likedCache.pages[0].data[0].content).toBe("Texto editado desde servidor");
      expect(detailCache.content).toBe("Texto editado desde servidor");

      // Sólo debe invalidar la query de búsqueda cuando searchTerm existe, nunca ["posts"]
      expect(invalidateSpy).toHaveBeenCalledTimes(1);
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["search", "react", "posts"]
      });
      expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: ["posts"] });
    });

    it("muestra toast de error y mantiene intacto el contenido en caché cuando PUT /api/posts/:id falla", async () => {
      const targetPost = buildMockPostWithLikes({ _id: "post_edit_err", content: "Texto intacto" });
      queryClient.setQueryData<PostWithLikes>(["posts", targetPost._id], targetPost);

      const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "");
      const onSuccess = vi.fn();

      server.use(
        http.put("/api/posts/:postId", () => {
          return HttpResponse.json(
            { message: "No autorizado para editar este post" },
            { status: 403 }
          );
        })
      );

      const { result } = renderHook(() => useEditPost(), {
        wrapper: createWrapper(queryClient)
      });

      act(() => {
        result.current.mutate({
          postData: targetPost,
          updatedTextContent: "Intento fallido",
          searchTerm: null,
          onSuccess
        });
      });

      await waitFor(() => {
        expect(toastErrorSpy).toHaveBeenCalledTimes(1);
      });

      expect(toastErrorSpy).toHaveBeenCalledWith("No autorizado para editar este post");
      expect(onSuccess).not.toHaveBeenCalled();
      expect(queryClient.getQueryData<PostWithLikes>(["posts", targetPost._id])?.content).toBe(
        "Texto intacto"
      );
    });
  });

  describe("useDeletePost", () => {
    it("elimina el post y redirige a '/' con replace: true sin invalidar ['posts'] cuando pathname es /post/:postId", async () => {
      let deletedId: string | undefined;
      server.use(
        http.delete("/api/posts/:postId", ({ params }) => {
          deletedId = params.postId as string;
          return HttpResponse.json({ message: "Eliminado" });
        })
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const onSuccess = vi.fn();

      const { result } = renderHook(
        () => ({
          deletePost: useDeletePost(),
          location: useLocation(),
          navigate: useNavigate()
        }),
        { wrapper: createWrapper(queryClient, ["/prev-route", "/post/post_del_1"]) }
      );

      expect(result.current.location.pathname).toBe("/post/post_del_1");

      act(() => {
        result.current.deletePost.mutate({
          postId: "post_del_1",
          pathname: "/post/post_del_1",
          searchTerm: "react",
          onSuccess
        });
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });

      expect(deletedId).toBe("post_del_1");
      expect(result.current.location.pathname).toBe("/");
      expect(invalidateSpy).not.toHaveBeenCalled();

      // Al retroceder en el historial debe volver a '/prev-route', demostrando que '/' reemplazó a '/post/post_del_1'
      act(() => {
        result.current.navigate(-1);
      });
      expect(result.current.location.pathname).toBe("/prev-route");
    });

    it("invalida ['posts'] y ['search', searchTerm, 'posts'] cuando se elimina desde una ruta distinta al detalle del post", async () => {
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const onSuccess = vi.fn();

      const { result } = renderHook(
        () => ({
          deletePost: useDeletePost(),
          location: useLocation()
        }),
        { wrapper: createWrapper(queryClient, ["/discover"]) }
      );

      act(() => {
        result.current.deletePost.mutate({
          postId: "post_del_2",
          pathname: "/discover",
          searchTerm: "vite",
          onSuccess
        });
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ["search", "vite", "posts"]
        });
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["posts"] });
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(result.current.location.pathname).toBe("/discover");
    });

    it("muestra toast de error y evita redirección o invalidaciones si DELETE /api/posts/:id falla", async () => {
      const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "");
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const onSuccess = vi.fn();

      server.use(
        http.delete("/api/posts/:postId", () => {
          return HttpResponse.json(
            { message: "Error eliminando publicación" },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(
        () => ({
          deletePost: useDeletePost(),
          location: useLocation()
        }),
        { wrapper: createWrapper(queryClient, ["/post/post_err_1"]) }
      );

      act(() => {
        result.current.deletePost.mutate({
          postId: "post_err_1",
          pathname: "/post/post_err_1",
          searchTerm: null,
          onSuccess
        });
      });

      await waitFor(() => {
        expect(toastErrorSpy).toHaveBeenCalledTimes(1);
      });

      expect(toastErrorSpy).toHaveBeenCalledWith("Error eliminando publicación");
      expect(onSuccess).not.toHaveBeenCalled();
      expect(invalidateSpy).not.toHaveBeenCalled();
      expect(result.current.location.pathname).toBe("/post/post_err_1");
    });
  });

  describe("useGetFeedPosts & fetchPosts", () => {
    it("consulta GET /api/posts con page y limit=5, pagina resultados, mantiene estabilidad referencial de posts y expone error en fallo", async () => {
      const page1Posts = Array.from({ length: 5 }, (_, i) =>
        buildMockPostWithLikes({ _id: `feed_p1_${i}`, content: `Post p1 ${i}` })
      );
      const page2Posts = Array.from({ length: 2 }, (_, i) =>
        buildMockPostWithLikes({ _id: `feed_p2_${i}`, content: `Post p2 ${i}` })
      );

      const requestedParams: Array<{ page: string | null; limit: string | null }> = [];

      server.use(
        http.get("/api/posts", ({ request }) => {
          const url = new URL(request.url);
          const page = url.searchParams.get("page");
          const limit = url.searchParams.get("limit");
          requestedParams.push({ page, limit });

          if (page === "1") {
            return HttpResponse.json({
              data: page1Posts,
              hasMore: true,
              nextPage: 2
            });
          }

          return HttpResponse.json({
            data: page2Posts,
            hasMore: false,
            nextPage: null
          });
        })
      );

      const { result, rerender } = renderHook(() => useGetFeedPosts(), {
        wrapper: createWrapper(queryClient)
      });

      await waitFor(() => {
        expect(result.current.loadingPosts).toBe(false);
        expect(result.current.posts).toHaveLength(5);
      });

      expect(requestedParams[0]).toEqual({ page: "1", limit: "5" });
      expect(result.current.hasNextPage).toBe(true);

      // Estabilidad referencial de useMemo entre re-renders sin cambios en data.pages
      const firstPostsReference = result.current.posts;
      rerender();
      expect(result.current.posts).toBe(firstPostsReference);

      // Consultar página 2
      act(() => {
        result.current.fetchNextPage();
      });

      await waitFor(() => {
        expect(result.current.posts).toHaveLength(7);
      });

      expect(requestedParams[1]).toEqual({ page: "2", limit: "5" });
      expect(result.current.hasNextPage).toBe(false);
      expect(result.current.posts.map((p) => p._id)).toEqual([
        ...page1Posts.map((p) => p._id),
        ...page2Posts.map((p) => p._id)
      ]);
    });

    it("expone error cuando GET /api/posts responde con fallo del servidor", async () => {
      server.use(
        http.get("/api/posts", () => {
          return HttpResponse.json({ message: "Error de servidor" }, { status: 500 });
        })
      );

      const { result } = renderHook(() => useGetFeedPosts(), {
        wrapper: createWrapper(queryClient)
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.posts).toEqual([]);
    });
  });

  describe("useGetPostById & getPost", () => {
    it("no ejecuta peticiones si postId es undefined y retorna el post desempaquetado cuando postId está definido", async () => {
      const mockPost = buildMockPostWithLikes({ _id: "post_detail_77", content: "Detalle único" });
      let requestCount = 0;

      server.use(
        http.get("/api/posts/:postId", ({ params }) => {
          requestCount += 1;
          expect(params.postId).toBe("post_detail_77");
          return HttpResponse.json({ data: mockPost });
        })
      );

      const { result, rerender } = renderHook(
        ({ postId }: { postId: string | undefined }) => useGetPostById({ postId }),
        {
          initialProps: { postId: undefined as string | undefined },
          wrapper: createWrapper(queryClient)
        }
      );

      expect(result.current.fetchStatus).toBe("idle");
      expect(requestCount).toBe(0);

      rerender({ postId: "post_detail_77" });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(requestCount).toBe(1);
      expect(result.current.data).toEqual(mockPost);
    });

    it("reintenta una vez (retry: 1) antes de exponer el error cuando GET /api/posts/:id falla", async () => {
      let requestCount = 0;

      server.use(
        http.get("/api/posts/:postId", () => {
          requestCount += 1;
          return HttpResponse.json({ message: "Post no encontrado" }, { status: 404 });
        })
      );

      const { result } = renderHook(
        () => useGetPostById({ postId: "missing_post_99" }),
        { wrapper: createWrapper(queryClient) }
      );

      await waitFor(
        () => {
          expect(result.current.isError).toBe(true);
        },
        { timeout: 3000 }
      );

      expect(requestCount).toBe(2);
      expect(result.current.error).toBeTruthy();
    });
  });
});
