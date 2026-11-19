import { useCallback, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { StoryType, UserWithStories } from "@/types/global";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";

const DEBOUNCE_MS = 250;

type StoryLikeEntry = StoryType["likedBy"][number];

type StoryToggleState = {
  pendingToggles: number;
  isRequestInFlight: boolean;
  baselineLikedBy: StoryLikeEntry[] | null;
  debounceTimer: ReturnType<typeof setTimeout> | null;
};

type MutationVariables = {
  storyId: string;
  username: string;
  currentUserId: string;
};

/** Alterna de forma inmutable el array `likedBy` de una historia para el usuario actual */
const toggleLikedByState = (
  likedBy: StoryLikeEntry[],
  currentUserId: string
): StoryLikeEntry[] => {
  const isLiked = likedBy.some((like) => like.user === currentUserId);

  return isLiked
    ? likedBy.filter((like) => like.user !== currentUserId)
    : [...likedBy, { user: currentUserId, likedAt: new Date() as unknown as string }];
};

/** Hook para alternar el like en un story con actualización optimista y coalescencia de clicks rápidos */
const useToggleLikeStory = (
  storyId: string,
  username: string | null,
  currentUserId: string | undefined
) => {
  const queryClient = useQueryClient();

  // Estado por historia para evitar colisiones si el usuario cambia de historia antes de que expire el debounce
  const storyStatesRef = useRef<Map<string, StoryToggleState>>(new Map());
  // Marca si alguna historia terminó de sincronizar mientras otra tenía cambios optimistas pendientes
  const needsInvalidationRef = useRef(false);

  useEffect(() => {
    const storyStates = storyStatesRef.current;

    return () => {
      storyStates.forEach((state) => {
        if (state.debounceTimer) {
          clearTimeout(state.debounceTimer);
          state.debounceTimer = null;
        }
      });
    };
  }, []);

  const hasAnyActiveStory = useCallback(() => {
    for (const state of storyStatesRef.current.values()) {
      if (state.isRequestInFlight || state.debounceTimer !== null || state.pendingToggles % 2 === 1) {
        return true;
      }
    }
    return false;
  }, []);

  /** Aplica el cambio optimista de like en la caché ['stories', username] */
  const applyOptimisticCacheToggle = useCallback(
    (targetStoryId: string, targetUsername: string, targetUserId: string) => {
      queryClient.setQueryData<UserWithStories | null>(
        ["stories", targetUsername],
        (oldData) => {
          if (!oldData?.stories) return oldData;

          const targetStory = oldData.stories.find((story) => story._id === targetStoryId);
          if (!targetStory) return oldData;

          return {
            ...oldData,
            stories: oldData.stories.map((story) =>
              story._id === targetStoryId
                ? {
                    ...story,
                    likedBy: toggleLikedByState(story.likedBy, targetUserId)
                  }
                : story
            )
          };
        }
      );
    },
    [queryClient]
  );

  const { mutate: executeServerToggle, isPending: isTogglingLikeStory } = useMutation({
    mutationKey: ["stories", username],
    mutationFn: async ({ storyId: targetStoryId }: MutationVariables) => {
      return axiosInstance<{ data: StoryType }>({
        method: "PUT",
        url: `/likes/story/${targetStoryId}`
      });
    },
    onSuccess: (_data, variables) => {
      const state = storyStatesRef.current.get(variables.storyId);

      // Avanzar el baseline confirmado tras el éxito por si hay clicks pendientes durante la petición en vuelo
      if (state && state.baselineLikedBy !== null) {
        state.baselineLikedBy = toggleLikedByState(
          state.baselineLikedBy,
          variables.currentUserId
        );
      }
    },
    onError: (error, variables) => {
      const state = storyStatesRef.current.get(variables.storyId);

      if (state) {
        if (state.debounceTimer) {
          clearTimeout(state.debounceTimer);
          state.debounceTimer = null;
        }

        if (state.baselineLikedBy !== null) {
          const rollbackLikedBy = state.baselineLikedBy;

          queryClient.setQueryData<UserWithStories | null>(
            ["stories", variables.username],
            (oldData) => {
              if (!oldData?.stories) return oldData;

              const targetStory = oldData.stories.find(
                (story) => story._id === variables.storyId
              );
              if (!targetStory) return oldData;

              return {
                ...oldData,
                stories: oldData.stories.map((story) =>
                  story._id === variables.storyId
                    ? { ...story, likedBy: rollbackLikedBy }
                    : story
                )
              };
            }
          );
        }

        state.pendingToggles = 0;
        state.baselineLikedBy = null;
      }

      toast.error(errorMessage(error));
    },
    onSettled: async (_data, error, variables) => {
      const state = storyStatesRef.current.get(variables.storyId);

      if (state) {
        state.isRequestInFlight = false;

        if (!error && state.pendingToggles % 2 === 1) {
          if (state.debounceTimer) {
            clearTimeout(state.debounceTimer);
            state.debounceTimer = null;
          }

          state.pendingToggles = 0;
          state.isRequestInFlight = true;
          executeServerToggle(variables);
          return;
        }

        state.pendingToggles = 0;
        state.baselineLikedBy = null;
      }

      if (!error) {
        if (hasAnyActiveStory()) {
          needsInvalidationRef.current = true;
          return;
        }

        needsInvalidationRef.current = false;
        await queryClient.invalidateQueries({
          queryKey: ["stories", variables.username]
        });
      }
    }
  });

  const toggleLikeStory = useCallback(() => {
    if (!storyId || !username || !currentUserId) return;

    const targetStoryId = storyId;
    const targetUsername = username;
    const targetUserId = currentUserId;

    let state = storyStatesRef.current.get(targetStoryId);
    if (!state) {
      state = {
        pendingToggles: 0,
        isRequestInFlight: false,
        baselineLikedBy: null,
        debounceTimer: null
      };
      storyStatesRef.current.set(targetStoryId, state);
    }

    // Guardar el estado base únicamente en el primer click de la ráfaga
    if (state.baselineLikedBy === null && !state.isRequestInFlight) {
      const cachedData = queryClient.getQueryData<UserWithStories | null>([
        "stories",
        targetUsername
      ]);
      const targetStory = cachedData?.stories?.find(
        (story) => story._id === targetStoryId
      );
      state.baselineLikedBy = targetStory ? [...targetStory.likedBy] : null;
    }

    // Cancelar queries en segundo plano sin bloquear la actualización sincrónica de la UI
    queryClient.cancelQueries({ queryKey: ["stories", targetUsername] });

    // Actualizar la UI de inmediato en cada click
    applyOptimisticCacheToggle(targetStoryId, targetUsername, targetUserId);
    state.pendingToggles += 1;

    if (state.debounceTimer) {
      clearTimeout(state.debounceTimer);
    }

    state.debounceTimer = setTimeout(() => {
      state!.debounceTimer = null;

      // Si hay una petición en vuelo para esta historia, onSettled sincronizará los clicks pendientes
      if (state!.isRequestInFlight) return;

      // Si el número de clicks en la ráfaga fue par, el estado final es idéntico al inicial:
      // no hace falta realizar ninguna petición al servidor
      if (state!.pendingToggles % 2 === 0) {
        state!.pendingToggles = 0;
        state!.baselineLikedBy = null;

        if (needsInvalidationRef.current && !hasAnyActiveStory()) {
          needsInvalidationRef.current = false;
          queryClient.invalidateQueries({
            queryKey: ["stories", targetUsername]
          });
        }
        return;
      }

      // Número impar de clicks: enviar una sola petición para sincronizar el cambio neto
      state!.pendingToggles = 0;
      state!.isRequestInFlight = true;
      executeServerToggle({
        storyId: targetStoryId,
        username: targetUsername,
        currentUserId: targetUserId
      });
    }, DEBOUNCE_MS);
  }, [
    applyOptimisticCacheToggle,
    currentUserId,
    executeServerToggle,
    hasAnyActiveStory,
    queryClient,
    storyId,
    username
  ]);

  return {
    toggleLikeStory,
    isTogglingLikeStory
  };
};

export default useToggleLikeStory;