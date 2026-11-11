import { useCallback, useEffect, useRef } from "react";
import {
  useMutation,
  useQueryClient,
  type InfiniteData,
  type QueryKey
} from "@tanstack/react-query";
import { toast } from "sonner";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import type { PostWithLikes } from "@/types/global";

type Props = {
  postId: string;
  searchTerm?: string;
};

type PaginatedPostsPage = {
  data: PostWithLikes[];
  hasMore: boolean;
  nextPage: number | null;
  totalResults?: number;
};

type CacheSnapshot = {
  previousPostsQueries: [QueryKey, unknown][];
  previousLikedPostsQueries: [QueryKey, InfiniteData<PaginatedPostsPage> | undefined][];
  previousSearchPostsQueries: [QueryKey, InfiniteData<PaginatedPostsPage> | undefined][];
};

const DEBOUNCE_MS = 250;

/** Alterna de forma inmutable el estado y contador de likes de un post */
const togglePostLikeState = (post: PostWithLikes): PostWithLikes => {
  const nextIsLiked = !post.isLiked;
  const nextLikesCount = Math.max(0, post.likesCount + (nextIsLiked ? 1 : -1));

  return {
    ...post,
    isLiked: nextIsLiked,
    likesCount: nextLikesCount
  };
};

/** Alternar el like en un post con actualización optimista y coalescencia de clics rápidos */
const useTogglePostLike = (props: Props) => {
  const { postId, searchTerm } = props;

  const queryClient = useQueryClient();

  // Cantidad de clicks optimistas pendientes de sincronizar con el servidor
  const pendingTogglesRef = useRef(0);
  // Indica si hay una petición HTTP en curso hacia el endpoint de likes
  const isRequestInFlightRef = useRef(false);
  // Snapshot del estado base confirmado antes de iniciar una ráfaga de clicks
  const baselineSnapshotRef = useRef<CacheSnapshot | null>(null);
  // Referencia al timer de debounce para agrupar clicks rápidos
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  /** Captura el estado actual de las cachés antes de aplicar cambios optimistas */
  const captureBaselineSnapshot = useCallback((): CacheSnapshot => {
    return {
      previousPostsQueries: queryClient.getQueriesData({queryKey: ["posts"]}),
      previousLikedPostsQueries: queryClient
        .getQueriesData<InfiniteData<PaginatedPostsPage>>({queryKey: ["likes", "likedPosts"]}),
      previousSearchPostsQueries: queryClient
        .getQueriesData<InfiniteData<PaginatedPostsPage>>({
          predicate: (query) => {
            return query.queryKey[0] === "search" && query.queryKey[2] === "posts"
          }
        })
    };
  }, [queryClient]);

  /** Aplica el cambio optimista de like en todas las cachés relevantes */
  const applyOptimisticCacheToggle = useCallback(() => {
    const updatePostInInfinitePages = (
      oldData: InfiniteData<PaginatedPostsPage> | undefined
    ): InfiniteData<PaginatedPostsPage> | undefined => {
      if (!oldData?.pages) return oldData;

      return {
        ...oldData,
        pages: oldData.pages.map((page) => ({
          ...page,
          data: page.data.map((post) =>
            post._id === postId ? togglePostLikeState(post) : post
          )
        }))
      };
    };

    // 1. Actualizar cachés infinitas de posts (Feed ["posts"] y Perfil ["posts", clerkId])
    queryClient.setQueriesData<InfiniteData<PaginatedPostsPage>>(
      { queryKey: ["posts"] },
      updatePostInInfinitePages
    );

    // 2. Actualizar caché individual del post (PostPage ["posts", postId])
    queryClient.setQueryData<PostWithLikes | false>(
      ["posts", postId],
      (oldPost) => (oldPost ? togglePostLikeState(oldPost) : oldPost)
    );

    // 3. Actualizar caché de posts gustados en el perfil (["likes", "likedPosts"])
    queryClient.setQueriesData<InfiniteData<PaginatedPostsPage>>(
      { queryKey: ["likes", "likedPosts"] },
      updatePostInInfinitePages
    );

    // 4. Actualizar cachés de búsqueda de posts (["search", searchTerm, "posts"])
    if (searchTerm) {
      queryClient.setQueryData<InfiniteData<PaginatedPostsPage>>(
        ["search", searchTerm, "posts"],
        updatePostInInfinitePages
      );
    } else {
      queryClient.setQueriesData<InfiniteData<PaginatedPostsPage>>(
        {
          predicate: (query) =>
            query.queryKey[0] === "search" && query.queryKey[2] === "posts"
        },
        updatePostInInfinitePages
      );
    }
  }, [postId, queryClient, searchTerm]);

  const { mutate: executeServerToggle, isPending } = useMutation({
    mutationFn: async () => {
      return axiosInstance({
        method: "POST",
        url: `/likes/post/${postId}`
      });
    },
    onError: (error) => {
      // Revertir todas las cachés al snapshot base previo a la ráfaga de clics
      const snapshot = baselineSnapshotRef.current;

      if (snapshot) {
        snapshot.previousPostsQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });

        snapshot.previousLikedPostsQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });

        snapshot.previousSearchPostsQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }

      pendingTogglesRef.current = 0;
      baselineSnapshotRef.current = null;

      toast.error(errorMessage(error));
    },
    onSettled: async () => {
      isRequestInFlightRef.current = false;

      // Si el usuario volvió a hacer un número impar de clics mientras la petición estaba en vuelo,
      // enviamos una única petición adicional para sincronizar el estado final
      if (pendingTogglesRef.current % 2 === 1) {
        pendingTogglesRef.current = 0;
        isRequestInFlightRef.current = true;
        executeServerToggle();
        return;
      }

      pendingTogglesRef.current = 0;
      baselineSnapshotRef.current = null;

      // Invalidar la lista de usuarios que dieron like al post en el Popover
      await queryClient.invalidateQueries({
        queryKey: ["likes", "post", postId]
      });

      // Marcar ["likes", "likedPosts"] como obsoleto sin disparar un refetch inmediato
      await queryClient.invalidateQueries({
        queryKey: ["likes", "likedPosts"],
        refetchType: "none"
      });
    }
  });

  const togglePostLikeMutation = useCallback(() => {
    // Guardar el snapshot base únicamente en el primer clic de la ráfaga
    if (!baselineSnapshotRef.current && !isRequestInFlightRef.current) {
      baselineSnapshotRef.current = captureBaselineSnapshot();
    }

    // Cancelar queries en segundo plano sin bloquear la actualización sincrónica de la UI
    queryClient.cancelQueries({ queryKey: ["posts"] });
    queryClient.cancelQueries({ queryKey: ["likes", "likedPosts"] });
    queryClient.cancelQueries({
      predicate: (query) =>
        query.queryKey[0] === "search" && query.queryKey[2] === "posts"
    });

    // Actualizar la UI de inmediato en cada clic
    applyOptimisticCacheToggle();
    pendingTogglesRef.current += 1;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      // Si hay una petición en vuelo, onSettled se encargará de sincronizar los clics pendientes
      if (isRequestInFlightRef.current) return;

      // Si el número de clics en la ráfaga fue par, el estado final es idéntico al inicial:
      // no hace falta realizar ninguna petición al servidor
      if (pendingTogglesRef.current % 2 === 0) {
        pendingTogglesRef.current = 0;
        baselineSnapshotRef.current = null;
        return;
      }

      // Número impar de clics: enviar una sola petición para sincronizar el cambio neto
      pendingTogglesRef.current = 0;
      isRequestInFlightRef.current = true;
      executeServerToggle();
    }, DEBOUNCE_MS);
  }, [applyOptimisticCacheToggle, captureBaselineSnapshot, executeServerToggle, queryClient]);

  return {
    togglePostLikeMutation,
    isPending
  };
};

export default useTogglePostLike;