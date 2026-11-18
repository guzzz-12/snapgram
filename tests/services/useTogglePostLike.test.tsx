import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider, type InfiniteData } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import useTogglePostLike from "@/services/likes/useTogglePostLike";
import { server } from "../mocks/server";
import { buildMockPostWithLikes } from "../mocks/posts/factories";
import type { PostWithLikes } from "@/types/global";

type PaginatedPostsPage = {
  data: PostWithLikes[];
  hasMore: boolean;
  nextPage: number | null;
  totalResults?: number;
};

/**
 * Suite de integración para el hook `useTogglePostLike` (`src/services/likes/useTogglePostLike.ts`).
 *
 * Propósito:
 *   Validar la actualización optimista sincronizada entre múltiples cachés de TanStack Query,
 *   la coalescencia de ráfagas de clics con debounce de 250ms, el manejo de clics concurrentes
 *   mientras existe una petición en vuelo y el rollback íntegro ante errores de API.
 *
 * Qué evalúa y alcance:
 *   - Actualización optimista en `["posts"]`, `["posts", userClerkId]`, `["posts", postId]`,
 *     `["likes", "likedPosts"]` y `["search", searchTerm, "posts"]`, sin alterar otros posts.
 *   - Ventana exacta de debounce de 250ms y cancelación automática ante ráfagas pares (0 peticiones HTTP).
 *   - Coalescencia de ráfagas impares en una única petición HTTP e invalidación de queries dependientes.
 *   - Rollback de todas las cachés al snapshot base previo a la ráfaga y notificación toast ante error 500.
 *   - Sincronización secuencial en `onSettled` para clics ocurridos durante una petición en vuelo
 *     y cancelación del timer pendiente al desmontar el hook.
 */
describe("useTogglePostLike", () => {
  let queryClient: QueryClient;

  const createWrapper = (client: QueryClient) => {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };

  const seedCachesForPost = (targetPost: PostWithLikes, otherPost: PostWithLikes, searchTerm = "react") => {
    const infinitePage: InfiniteData<PaginatedPostsPage> = {
      pages: [
        {
          data: [targetPost, otherPost],
          hasMore: false,
          nextPage: null
        }
      ],
      pageParams: [1]
    };

    queryClient.setQueryData(["posts"], infinitePage);
    queryClient.setQueryData(["posts", "clerk_profile_1"], infinitePage);
    queryClient.setQueryData<PostWithLikes>(["posts", targetPost._id], targetPost);
    queryClient.setQueryData(["likes", "likedPosts"], infinitePage);
    queryClient.setQueryData(["search", searchTerm, "posts"], infinitePage);
    queryClient.setQueryData(["search", "other-term", "posts"], infinitePage);
  };

  const getPostFromInfinite = (queryKey: unknown[], postId: string) => {
    const data = queryClient.getQueryData<InfiniteData<PaginatedPostsPage>>(queryKey);
    return data?.pages[0].data.find((p) => p._id === postId);
  };

  beforeEach(() => {
    vi.useFakeTimers();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    queryClient.clear();
  });

  it("aplica actualización optimista inmediata en todas las cachés relevantes y envía una única petición tras 250ms de debounce", async () => {
    const targetPost = buildMockPostWithLikes({ isLiked: false, likesCount: 5 });
    const otherPost = buildMockPostWithLikes({ isLiked: false, likesCount: 2 });
    seedCachesForPost(targetPost, otherPost, "react");

    let requestCount = 0;
    let requestedPostId: string | undefined;

    server.use(
      http.post("/api/likes/post/:postId", ({ params }) => {
        requestCount += 1;
        requestedPostId = params.postId as string;
        return HttpResponse.json({ data: { postId: params.postId } });
      })
    );

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(
      () => useTogglePostLike({ postId: targetPost._id, searchTerm: "react" }),
      { wrapper: createWrapper(queryClient) }
    );

    // Disparo inmediato (0ms): la UI se actualiza sincrónicamente sin haber enviado la petición aún
    act(() => {
      result.current.togglePostLikeMutation();
    });

    expect(requestCount).toBe(0);

    // Todas las cachés del post objetivo deben reflejar el nuevo estado optimista
    expect(getPostFromInfinite(["posts"], targetPost._id)).toMatchObject({
      isLiked: true,
      likesCount: 6
    });
    expect(getPostFromInfinite(["posts", "clerk_profile_1"], targetPost._id)).toMatchObject({
      isLiked: true,
      likesCount: 6
    });
    expect(queryClient.getQueryData<PostWithLikes>(["posts", targetPost._id])).toMatchObject({
      isLiked: true,
      likesCount: 6
    });
    expect(getPostFromInfinite(["likes", "likedPosts"], targetPost._id)).toMatchObject({
      isLiked: true,
      likesCount: 6
    });
    expect(getPostFromInfinite(["search", "react", "posts"], targetPost._id)).toMatchObject({
      isLiked: true,
      likesCount: 6
    });

    // El post no objetivo y la caché de otro searchTerm no deben ser alterados
    expect(getPostFromInfinite(["posts"], otherPost._id)).toMatchObject({
      isLiked: false,
      likesCount: 2
    });
    expect(getPostFromInfinite(["search", "other-term", "posts"], targetPost._id)).toMatchObject({
      isLiked: false,
      likesCount: 5
    });

    // A los 249ms el debounce todavía no debe haber disparado la petición HTTP
    await act(async () => {
      await vi.advanceTimersByTimeAsync(249);
    });
    expect(requestCount).toBe(0);

    // Al cumplirse los 250ms se envía exactamente 1 petición y onSettled invalida las queries dependientes
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(requestCount).toBe(1);
    expect(requestedPostId).toBe(targetPost._id);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["likes", "post", targetPost._id] });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["likes", "likedPosts"],
      refetchType: "none"
    });
  });

  it("coalesce una ráfaga par (2 clics rápidos) revirtiendo el estado optimista sin enviar ninguna petición HTTP", async () => {
    const targetPost = buildMockPostWithLikes({ isLiked: false, likesCount: 5 });
    const otherPost = buildMockPostWithLikes();
    seedCachesForPost(targetPost, otherPost);

    let requestCount = 0;
    server.use(
      http.post("/api/likes/post/:postId", () => {
        requestCount += 1;
        return HttpResponse.json({ ok: true });
      })
    );

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(
      () => useTogglePostLike({ postId: targetPost._id }),
      { wrapper: createWrapper(queryClient) }
    );

    // Clic 1: cambia a liked
    act(() => {
      result.current.togglePostLikeMutation();
    });
    expect(queryClient.getQueryData<PostWithLikes>(["posts", targetPost._id])).toMatchObject({
      isLiked: true,
      likesCount: 6
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // Clic 2 dentro de la ventana de 250ms: vuelve al estado inicial
    act(() => {
      result.current.togglePostLikeMutation();
    });
    expect(queryClient.getQueryData<PostWithLikes>(["posts", targetPost._id])).toMatchObject({
      isLiked: false,
      likesCount: 5
    });

    // Incluso sin searchTerm, debe actualizar todas las cachés de búsqueda ["search", *, "posts"]
    expect(getPostFromInfinite(["search", "other-term", "posts"], targetPost._id)).toMatchObject({
      isLiked: false,
      likesCount: 5
    });

    // Avanzar más allá de los 250ms: no debe haber peticiones ni invalidaciones
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(requestCount).toBe(0);
    expect(invalidateSpy).not.toHaveBeenCalled();

    // Un nuevo clic posterior debe funcionar normalmente tras limpiar los refs de la ráfaga cancelada
    act(() => {
      result.current.togglePostLikeMutation();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(requestCount).toBe(1);
  });

  it("coalesce una ráfaga impar (3 clics rápidos) en una sola petición HTTP y aplica el cambio neto en caché", async () => {
    const targetPost = buildMockPostWithLikes({ isLiked: true, likesCount: 1 });
    const otherPost = buildMockPostWithLikes();
    seedCachesForPost(targetPost, otherPost, "react");

    let requestCount = 0;
    server.use(
      http.post("/api/likes/post/:postId", () => {
        requestCount += 1;
        return HttpResponse.json({ ok: true });
      })
    );

    const { result } = renderHook(
      () => useTogglePostLike({ postId: targetPost._id, searchTerm: "react" }),
      { wrapper: createWrapper(queryClient) }
    );

    // Clic 1 (true -> false, 0)
    act(() => {
      result.current.togglePostLikeMutation();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // Clic 2 (false -> true, 1)
    act(() => {
      result.current.togglePostLikeMutation();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // Clic 3 (true -> false, 0)
    act(() => {
      result.current.togglePostLikeMutation();
    });

    // Antes de los 250ms desde el último clic no debe haberse disparado ninguna petición
    await act(async () => {
      await vi.advanceTimersByTimeAsync(249);
    });
    expect(requestCount).toBe(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(requestCount).toBe(1);
    expect(getPostFromInfinite(["posts"], targetPost._id)).toMatchObject({
      isLiked: false,
      likesCount: 0
    });
    expect(queryClient.getQueryData<PostWithLikes>(["posts", targetPost._id])).toMatchObject({
      isLiked: false,
      likesCount: 0
    });
  });

  it("revierte todas las cachés modificadas al snapshot base y muestra toast de error si POST /api/likes/post/:postId responde 500", async () => {
    const targetPost = buildMockPostWithLikes({ isLiked: false, likesCount: 5 });
    const otherPost = buildMockPostWithLikes({ isLiked: true, likesCount: 10 });
    seedCachesForPost(targetPost, otherPost, "react");

    const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "");

    server.use(
      http.post("/api/likes/post/:postId", () => {
        return HttpResponse.json(
          { message: "Error al procesar el like" },
          { status: 500 }
        );
      })
    );

    const { result } = renderHook(
      () => useTogglePostLike({ postId: targetPost._id, searchTerm: "react" }),
      { wrapper: createWrapper(queryClient) }
    );

    // Ráfaga impar de 3 clics: antes de responder el servidor el estado optimista debe quedar en true / 6
    act(() => {
      result.current.togglePostLikeMutation();
      result.current.togglePostLikeMutation();
      result.current.togglePostLikeMutation();
    });

    expect(getPostFromInfinite(["posts"], targetPost._id)).toMatchObject({
      isLiked: true,
      likesCount: 6
    });
    expect(getPostFromInfinite(["likes", "likedPosts"], targetPost._id)).toMatchObject({
      isLiked: true,
      likesCount: 6
    });
    expect(getPostFromInfinite(["search", "react", "posts"], targetPost._id)).toMatchObject({
      isLiked: true,
      likesCount: 6
    });

    // Ejecutar el envío al cumplirse el debounce -> falla con 500
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });

    expect(toastErrorSpy).toHaveBeenCalledTimes(1);
    expect(toastErrorSpy).toHaveBeenCalledWith("Error al procesar el like");

    // Todas las cachés deben revertirse exactamente al snapshot base (false / 5)
    expect(getPostFromInfinite(["posts"], targetPost._id)).toMatchObject({
      isLiked: false,
      likesCount: 5
    });
    expect(getPostFromInfinite(["posts", "clerk_profile_1"], targetPost._id)).toMatchObject({
      isLiked: false,
      likesCount: 5
    });
    expect(queryClient.getQueryData<PostWithLikes>(["posts", targetPost._id])).toMatchObject({
      isLiked: false,
      likesCount: 5
    });
    expect(getPostFromInfinite(["likes", "likedPosts"], targetPost._id)).toMatchObject({
      isLiked: false,
      likesCount: 5
    });
    expect(getPostFromInfinite(["search", "react", "posts"], targetPost._id)).toMatchObject({
      isLiked: false,
      likesCount: 5
    });
    expect(getPostFromInfinite(["posts"], otherPost._id)).toMatchObject({
      isLiked: true,
      likesCount: 10
    });
  });

  it("sincroniza clics ocurridos durante una petición en vuelo disparando seguimiento en onSettled sólo cuando el saldo pendiente es impar", async () => {
    const targetPost = buildMockPostWithLikes({ isLiked: false, likesCount: 5 });
    const otherPost = buildMockPostWithLikes();
    seedCachesForPost(targetPost, otherPost);

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const pendingResolvers: Array<() => void> = [];
    let requestCount = 0;

    server.use(
      http.post("/api/likes/post/:postId", () => {
        requestCount += 1;
        return new Promise((resolve) => {
          pendingResolvers.push(() => resolve(HttpResponse.json({ ok: true })));
        });
      })
    );

    const { result } = renderHook(
      () => useTogglePostLike({ postId: targetPost._id }),
      { wrapper: createWrapper(queryClient) }
    );

    // 1. Clic inicial -> tras 250ms comienza la petición #1 y queda en vuelo
    act(() => {
      result.current.togglePostLikeMutation();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(requestCount).toBe(1);
    expect(pendingResolvers).toHaveLength(1);
    expect(result.current.isPending).toBe(true);

    // 2. Mientras la petición #1 está en vuelo, el usuario hace 1 clic (impar -> revertir like)
    act(() => {
      result.current.togglePostLikeMutation();
    });
    expect(queryClient.getQueryData<PostWithLikes>(["posts", targetPost._id])).toMatchObject({
      isLiked: false,
      likesCount: 5
    });

    // El timer de debounce expira mientras la petición #1 sigue en vuelo: NO debe abrir una segunda petición concurrente
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(requestCount).toBe(1);

    // 3. Al resolver la petición #1, onSettled detecta 1 clic pendiente (impar) y dispara la petición #2
    await act(async () => {
      pendingResolvers.shift()!();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(requestCount).toBe(2);
    expect(pendingResolvers).toHaveLength(1);
    expect(result.current.isPending).toBe(true);

    // 4. Mientras la petición #2 está en vuelo, el usuario hace 2 clics (par -> sin cambio neto)
    act(() => {
      result.current.togglePostLikeMutation();
      result.current.togglePostLikeMutation();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(requestCount).toBe(2);

    // Al resolver la petición #2, onSettled ve 2 clics pendientes (par), finaliza la mutación e invalida las cachés
    await act(async () => {
      pendingResolvers.shift()!();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(result.current.isPending).toBe(false);
    expect(requestCount).toBe(2);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["likes", "post", targetPost._id] });
    expect(queryClient.getQueryData<PostWithLikes>(["posts", targetPost._id])).toMatchObject({
      isLiked: false,
      likesCount: 5
    });
  });

  it("cancela explícitamente las consultas en segundo plano (posts, likedPosts y búsquedas) al disparar la mutación", () => {
    const targetPost = buildMockPostWithLikes({ isLiked: false, likesCount: 5 });
    const otherPost = buildMockPostWithLikes();
    seedCachesForPost(targetPost, otherPost, "react");

    // Espiar el método cancelQueries del QueryClient
    const cancelQueriesSpy = vi.spyOn(queryClient, "cancelQueries");

    const { result } = renderHook(
      () => useTogglePostLike({ postId: targetPost._id, searchTerm: "react" }),
      { wrapper: createWrapper(queryClient) }
    );

    act(() => {
      result.current.togglePostLikeMutation();
    });

    // 1. Verificar cancelación de queries generales de posts
    expect(cancelQueriesSpy).toHaveBeenCalledWith({ queryKey: ["posts"] });

    // 2. Verificar cancelación de queries de posts gustados
    expect(cancelQueriesSpy).toHaveBeenCalledWith({ queryKey: ["likes", "likedPosts"] });

    // 3. Verificar que se invoque cancelQueries con un predicado para las búsquedas
    expect(cancelQueriesSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        predicate: expect.any(Function),
      })
    );

    // 4. Validar la robustez del predicado de búsqueda evaluando claves reales
    const searchCall = cancelQueriesSpy.mock.calls.find(
      ([filters]) => typeof filters?.predicate === "function"
    );

    const predicate = searchCall?.[0]?.predicate;
    expect(predicate).toBeTypeOf("function");

    if (predicate) {
      // Debe retornar true para una query de búsqueda de posts válida
      expect(predicate({ queryKey: ["search", "react", "posts"] } as never)).toBe(true);

      // Debe retornar false para queries ajenas
      expect(predicate({ queryKey: ["posts", targetPost._id] } as never)).toBe(false);
      expect(predicate({ queryKey: ["search", "react", "comments"] } as never)).toBe(false);
    }
  });

  it("cancela el timer de debounce pendiente al desmontar el hook evitando peticiones huérfanas", async () => {
    const targetPost = buildMockPostWithLikes({ isLiked: false, likesCount: 5 });
    const otherPost = buildMockPostWithLikes();
    seedCachesForPost(targetPost, otherPost);

    let requestCount = 0;
    server.use(
      http.post("/api/likes/post/:postId", () => {
        requestCount += 1;
        return HttpResponse.json({ ok: true });
      })
    );

    const { result, unmount } = renderHook(
      () => useTogglePostLike({ postId: targetPost._id }),
      { wrapper: createWrapper(queryClient) }
    );

    act(() => {
      result.current.togglePostLikeMutation();
    });

    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(requestCount).toBe(0);
  });
});
