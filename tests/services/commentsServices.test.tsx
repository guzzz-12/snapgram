import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import {
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
  useGetPostComments,
  useGetCommentReplies
} from "@/services/comments";
import { server } from "../mocks/server";
import { buildMockComment } from "../mocks/comments/factories";

/**
 * Suite de integración para los servicios de comentarios y respuestas anidadas (`src/services/comments/*`).
 *
 * Propósito:
 *   Validar el ciclo completo de lectura paginada, creación (comentarios raíz y respuestas con FormData),
 *   edición, eliminación y manejo de errores de API para comentarios de publicaciones.
 *
 * Qué evalúa y alcance (SUTs):
 *   - `useCreateComment`: envío de `FormData` hacia `POST /api/comments/posts/:postId`,
 *     invalidación de `["posts"]` y `["postComments", postId]` en comentarios raíz,
 *     invalidación adicional de `["commentReplies", parentId]` al incluir `parentId`, y `toast.error` en fallos.
 *   - `useUpdateComment`: envío de `{ content }` hacia `PUT /api/comments/:id`, invalidación
 *     de `["postComments", postId]` y manejo de errores.
 *   - `useDeleteComment`: envío `DELETE /api/comments/:id`, invalidación de `["postComments", postId]`
 *     y `["commentReplies", commentId]`, más manejo de errores.
 *   - `useGetPostComments`: guarda `enabled`, paginación infinita (`page`, `limit=5`),
 *     aplanamiento de `comments` y exposición de `commentsError`.
 *   - `useGetCommentReplies`: inactividad mientras `openReplies === false`, activación al abrir,
 *     paginación infinita (`limit=5`) y aplanamiento de `commentReplies`.
 */
describe("commentsServices (useCreateComment, useUpdateComment, useDeleteComment, useGetPostComments, useGetCommentReplies)", () => {
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
    queryClient.clear();
  });

  describe("useCreateComment", () => {
    it("envía FormData a POST /api/comments/posts/:postId para un comentario raíz e invalida ['posts'] y ['postComments', postId] sin invalidar respuestas", async () => {
      let capturedPostId: string | undefined;
      let capturedContent: string | null = null;
      let capturedParentId: FormDataEntryValue | null = null;
      let capturedContentType: string | null = null;

      server.use(
        http.post("/api/comments/posts/:postId", async ({ params, request }) => {
          capturedPostId = params.postId as string;
          capturedContentType = request.headers.get("content-type");
          const formData = await request.formData();
          capturedContent = formData.get("content")?.toString() ?? null;
          capturedParentId = formData.get("parentId");

          return HttpResponse.json({
            data: buildMockComment({ content: capturedContent ?? "" })
          });
        })
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const onSuccess = vi.fn();

      const { result } = renderHook(() => useCreateComment(), {
        wrapper: createWrapper(queryClient)
      });

      const formData = new FormData();
      formData.append("content", "Excelente publicación!");

      act(() => {
        result.current.createCommentMutation({
          postId: "post_root_10",
          formData,
          onSuccess
        });
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });

      expect(capturedPostId).toBe("post_root_10");
      expect(capturedContentType).toMatch(/multipart\/form-data/i);
      expect(capturedContent).toBe("Excelente publicación!");
      expect(capturedParentId).toBeNull();

      expect(invalidateSpy).toHaveBeenCalledTimes(2);
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["posts"] });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["postComments", "post_root_10"]
      });
    });

    it("invalida también ['commentReplies', parentId] cuando el FormData incluye parentId", async () => {
      let capturedParentId: string | null = null;
      let capturedContent: string | null = null;

      server.use(
        http.post("/api/comments/posts/:postId", async ({ request }) => {
          const formData = await request.formData();
          capturedParentId = formData.get("parentId")?.toString() ?? null;
          capturedContent = formData.get("content")?.toString() ?? null;
          return HttpResponse.json({ data: buildMockComment() });
        })
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const onSuccess = vi.fn();

      const { result } = renderHook(() => useCreateComment(), {
        wrapper: createWrapper(queryClient)
      });

      const formData = new FormData();
      formData.append("content", "Respuesta al comentario");
      formData.append("parentId", "comment_parent_77");

      act(() => {
        result.current.createCommentMutation({
          postId: "post_root_10",
          formData,
          onSuccess
        });
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });

      expect(capturedParentId).toBe("comment_parent_77");
      expect(capturedContent).toBe("Respuesta al comentario");
      expect(invalidateSpy).toHaveBeenCalledTimes(3);
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["posts"] });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["postComments", "post_root_10"]
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["commentReplies", "comment_parent_77"]
      });
    });

    it("muestra toast de error con el mensaje del servidor y evita invalidaciones o onSuccess si falla POST /api/comments/posts/:postId", async () => {
      const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "");
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const onSuccess = vi.fn();

      server.use(
        http.post("/api/comments/posts/:postId", () => {
          return HttpResponse.json(
            { message: "El comentario no puede estar vacío" },
            { status: 400 }
          );
        })
      );

      const { result } = renderHook(() => useCreateComment(), {
        wrapper: createWrapper(queryClient)
      });

      const formData = new FormData();
      formData.append("content", "");

      act(() => {
        result.current.createCommentMutation({
          postId: "post_root_10",
          formData,
          onSuccess
        });
      });

      await waitFor(() => {
        expect(toastErrorSpy).toHaveBeenCalledTimes(1);
      });

      expect(toastErrorSpy).toHaveBeenCalledWith("El comentario no puede estar vacío");
      expect(invalidateSpy).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe("useUpdateComment", () => {
    it("envía PUT /api/comments/:id con { content }, invalida ['postComments', postId] y ejecuta onSuccess", async () => {
      const comment = buildMockComment({
        _id: "comment_upd_1",
        post: { _id: "post_upd_99", userId: "author_1" }
      });

      let capturedId: string | undefined;
      let capturedBody: { content: string } | null = null;

      server.use(
        http.put("/api/comments/:commentId", async ({ params, request }) => {
          capturedId = params.commentId as string;
          capturedBody = (await request.json()) as { content: string };
          return HttpResponse.json({ data: { ...comment, content: capturedBody.content } });
        })
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const onSuccess = vi.fn();

      const { result } = renderHook(() => useUpdateComment(), {
        wrapper: createWrapper(queryClient)
      });

      act(() => {
        result.current.updateCommentMutation({
          commentData: comment,
          commentText: "Comentario actualizado",
          onSuccess
        });
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });

      expect(capturedId).toBe("comment_upd_1");
      expect(capturedBody).toEqual({ content: "Comentario actualizado" });
      expect(invalidateSpy).toHaveBeenCalledTimes(1);
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["postComments", "post_upd_99"]
      });
    });

    it("muestra toast de error y evita invalidaciones o onSuccess cuando PUT /api/comments/:id falla", async () => {
      const comment = buildMockComment({ _id: "comment_upd_err" });
      const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "");
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const onSuccess = vi.fn();

      server.use(
        http.put("/api/comments/:commentId", () => {
          return HttpResponse.json(
            { message: "No autorizado para editar este comentario" },
            { status: 403 }
          );
        })
      );

      const { result } = renderHook(() => useUpdateComment(), {
        wrapper: createWrapper(queryClient)
      });

      act(() => {
        result.current.updateCommentMutation({
          commentData: comment,
          commentText: "Intento no autorizado",
          onSuccess
        });
      });

      await waitFor(() => {
        expect(toastErrorSpy).toHaveBeenCalledTimes(1);
      });

      expect(toastErrorSpy).toHaveBeenCalledWith("No autorizado para editar este comentario");
      expect(invalidateSpy).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe("useDeleteComment", () => {
    it("envía DELETE /api/comments/:id, invalida ['postComments', postId] y ['commentReplies', commentId], y ejecuta onSuccess", async () => {
      const comment = buildMockComment({
        _id: "comment_del_5",
        post: { _id: "post_del_55", userId: "author_1" }
      });

      let deletedId: string | undefined;
      server.use(
        http.delete("/api/comments/:commentId", ({ params }) => {
          deletedId = params.commentId as string;
          return HttpResponse.json({ message: "Eliminado" });
        })
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const onSuccess = vi.fn();

      const { result } = renderHook(() => useDeleteComment(), {
        wrapper: createWrapper(queryClient)
      });

      act(() => {
        result.current.deleteCommentMutation({
          commentData: comment,
          onSuccess
        });
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });

      expect(deletedId).toBe("comment_del_5");
      expect(invalidateSpy).toHaveBeenCalledTimes(2);
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["postComments", "post_del_55"]
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["commentReplies", "comment_del_5"]
      });
    });

    it("muestra toast de error y evita invalidaciones o onSuccess cuando DELETE /api/comments/:id falla", async () => {
      const comment = buildMockComment({ _id: "comment_del_err" });
      const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "");
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const onSuccess = vi.fn();

      server.use(
        http.delete("/api/comments/:commentId", () => {
          return HttpResponse.json(
            { message: "No se pudo eliminar el comentario" },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useDeleteComment(), {
        wrapper: createWrapper(queryClient)
      });

      act(() => {
        result.current.deleteCommentMutation({
          commentData: comment,
          onSuccess
        });
      });

      await waitFor(() => {
        expect(toastErrorSpy).toHaveBeenCalledTimes(1);
      });

      expect(toastErrorSpy).toHaveBeenCalledWith("No se pudo eliminar el comentario");
      expect(invalidateSpy).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe("useGetPostComments", () => {
    it("permanece inactivo mientras enabled es false y pagina los comentarios de un post con limit=5", async () => {
      const page1Comments = Array.from({ length: 5 }, (_, i) =>
        buildMockComment({ _id: `pc_1_${i}`, content: `Comentario ${i}` })
      );
      const page2Comments = [buildMockComment({ _id: "pc_2_0", content: "Comentario 5" })];
      const requestedParams: Array<{ postId: string; page: string | null; limit: string | null }> = [];

      server.use(
        http.get("/api/comments/posts/:postId", ({ params, request }) => {
          const url = new URL(request.url);
          const page = url.searchParams.get("page");
          const limit = url.searchParams.get("limit");
          requestedParams.push({ postId: params.postId as string, page, limit });

          if (page === "1") {
            return HttpResponse.json({
              data: page1Comments,
              hasMore: true,
              nextPage: 2
            });
          }

          return HttpResponse.json({
            data: page2Comments,
            hasMore: false,
            nextPage: null
          });
        })
      );

      const { result, rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) =>
          useGetPostComments({ postId: "post_comments_1", enabled }),
        {
          initialProps: { enabled: false },
          wrapper: createWrapper(queryClient)
        }
      );

      expect(requestedParams).toHaveLength(0);
      expect(result.current.comments).toEqual([]);
      expect(result.current.loadingComments).toBe(false);

      // Activar la consulta
      rerender({ enabled: true });

      await waitFor(() => {
        expect(result.current.loadingComments).toBe(false);
        expect(result.current.comments).toHaveLength(5);
      });

      expect(requestedParams[0]).toEqual({
        postId: "post_comments_1",
        page: "1",
        limit: "5"
      });
      expect(result.current.hasNextPage).toBe(true);

      // Cargar página 2
      act(() => {
        result.current.fetchNextPage();
      });

      await waitFor(() => {
        expect(result.current.comments).toHaveLength(6);
      });

      expect(requestedParams[1]).toEqual({
        postId: "post_comments_1",
        page: "2",
        limit: "5"
      });
      expect(result.current.hasNextPage).toBe(false);
      expect(result.current.comments.map((c) => c._id)).toEqual([
        ...page1Comments.map((c) => c._id),
        "pc_2_0"
      ]);
    });

    it("expone commentsError cuando GET /api/comments/posts/:postId falla", async () => {
      server.use(
        http.get("/api/comments/posts/:postId", () => {
          return HttpResponse.json(
            { message: "Error al cargar comentarios" },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(
        () => useGetPostComments({ postId: "post_comments_err", enabled: true }),
        { wrapper: createWrapper(queryClient) }
      );

      await waitFor(() => {
        expect(result.current.commentsError).toBeTruthy();
      });

      expect(result.current.comments).toEqual([]);
      expect(result.current.loadingComments).toBe(false);
    });
  });

  describe("useGetCommentReplies", () => {
    it("permanece inactivo hasta que openReplies sea true y pagina respuestas con limit=5", async () => {
      const page1Replies = Array.from({ length: 5 }, (_, i) =>
        buildMockComment({ _id: `rep_1_${i}`, content: `Respuesta ${i}` })
      );
      const page2Replies = [buildMockComment({ _id: "rep_2_0", content: "Respuesta 5" })];
      const requestedParams: Array<{ commentId: string; page: string | null; limit: string | null }> =
        [];

      server.use(
        http.get("/api/comments/replies/comment/:commentId", ({ params, request }) => {
          const url = new URL(request.url);
          const page = url.searchParams.get("page");
          const limit = url.searchParams.get("limit");
          requestedParams.push({
            commentId: params.commentId as string,
            page,
            limit
          });

          if (page === "1") {
            return HttpResponse.json({
              data: page1Replies,
              hasMore: true,
              nextPage: 2
            });
          }

          return HttpResponse.json({
            data: page2Replies,
            hasMore: false,
            nextPage: null
          });
        })
      );

      const { result, rerender } = renderHook(
        ({ openReplies }: { openReplies: boolean }) =>
          useGetCommentReplies("comment_parent_1", openReplies),
        {
          initialProps: { openReplies: false },
          wrapper: createWrapper(queryClient)
        }
      );

      // Con openReplies=false no debe hacer ninguna petición
      expect(requestedParams).toHaveLength(0);
      expect(result.current.commentReplies).toEqual([]);
      expect(result.current.isLoading).toBe(false);

      // Abrir respuestas -> dispara consulta de página 1
      rerender({ openReplies: true });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.commentReplies).toHaveLength(5);
      });

      expect(requestedParams[0]).toEqual({
        commentId: "comment_parent_1",
        page: "1",
        limit: "5"
      });
      expect(result.current.hasNextPage).toBe(true);

      // Cargar página 2
      act(() => {
        result.current.fetchNextPage();
      });

      await waitFor(() => {
        expect(result.current.commentReplies).toHaveLength(6);
      });

      expect(requestedParams[1]).toEqual({
        commentId: "comment_parent_1",
        page: "2",
        limit: "5"
      });
      expect(result.current.hasNextPage).toBe(false);
      expect(result.current.commentReplies.map((r) => r._id)).toEqual([
        ...page1Replies.map((r) => r._id),
        "rep_2_0"
      ]);
    });
  });
});
