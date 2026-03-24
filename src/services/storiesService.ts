import { useAuth } from "@clerk/clerk-react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "@/utils/axiosInstance";
import { toast } from "sonner";
import { errorMessage } from "@/utils/errorMessage";
import type { StoryType, UsersHavingStories, UserWithStories } from "@/types/global";

export const useStoriesService = () => {
  const { getToken } = useAuth();

  const queryClient = useQueryClient();

  return {
    /** Consultar los usuarios que tienen stories publicadas activas */
    getUsersHavingStories: () => {
      const res = useInfiniteQuery({
        queryKey: ["stories"],
        queryFn: async ({ pageParam }) => {
          const token = await getToken();

          const { data } = await axiosInstance<{
            data: UsersHavingStories[];
            hasMore: boolean;
            nextPage: number | null;
          }>({
            method: "GET",
            url: "/stories",
            params: {
              page: pageParam,
              limit: 10
            },
            headers: {
              Authorization: `Bearer ${token}`
            },
          });

          return data;
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
        refetchOnWindowFocus: false
      });

      return {
        data: res.data?.pages.flatMap((page) => page.data) || [],
        error: res.error,
        loading: res.isLoading,
        isFetchingNextPage: res.isFetchingNextPage,
        hasNextPage: res.hasNextPage,
        fetchNextPage: res.fetchNextPage
      };
    },

    /**
     * Consultar las stories de un usuario mediante su username.
     * Si se especifica un storyId, se consulta una sola historia.
     * Si no se especifica un storyId, se consultan todas las historias.
     */
    getUserStories: (username: string | null, storyId?: string | null) => {
      const { data: storiesUserData, isLoading, error, isSuccess } = useQuery({
        queryKey: ["stories", username],
        queryFn: async () => {
          const token = await getToken();

          const { data } = await axiosInstance<{ data: UserWithStories | null }>({
            method: "GET",
            url: `/stories/${username}`,
            headers: {
              Authorization: `Bearer ${token}`,
            },
            params: {
              type: storyId ? "single" : "all",
              storyId
            }
          });

          return data.data;
        },
        enabled: !!username,
      });

      return {
        data: storiesUserData,
        isLoading,
        isSuccess,
        error,
      }
    },

    /** Marcar una historia como vista */
    markAsSeen: (storyId: string) => {
      const { mutate: markStoryAsSeen, isPending: isMarkingStoryAsSeen } = useMutation({
        mutationFn: async () => {
          const token = await getToken();

          return axiosInstance({
            method: "PUT",
            url: `/stories/seen/${storyId}`,
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
        },
        onError: (_error) => {
          console.log("Error actualizando historia")
        }
      });

      return {
        markStoryAsSeen,
        isMarkingStoryAsSeen
      }
    },

    /** Alternar el like en un story */
    toggleLikeStory: (
      storyId: string,
      username: string | null,
      currentUserId: string | undefined
    ) => {
      const { mutate: toggleLikeStory, isPending: isTogglingLikeStory } = useMutation({
        mutationKey: ["stories", username],
        mutationFn: async () => {
          const token = await getToken();

          return axiosInstance<{ data: StoryType }>({
            method: "PUT",
            url: `/likes/story/${storyId}`,
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
        },
        onSuccess: () => {
          // Actualizar la caché de la data de los stories del usuario
          // para mostrar el cambio del state del like inmediatamente.
          queryClient.setQueryData(["stories", username], (oldData: UserWithStories) => {
            const story = oldData.stories.find((story) => story._id === storyId);

            if (!story) {
              return oldData;
            }

            const isLiked = story.likedBy.some((like) => like.user === currentUserId);

            return {
              ...oldData,
              stories: oldData.stories.map((story) => {
                return (
                  story._id === storyId ? {
                    ...story,
                    likedBy: isLiked
                      ? story.likedBy.filter((like) => like.user !== currentUserId)
                      : [...story.likedBy, { user: currentUserId, likedAt: new Date() } as any],
                  } : story
                )
              }),
            };
          });

          queryClient.invalidateQueries({ queryKey: ["stories", username] });
        },
        onError: (error) => {
          console.log(error)
          console.log("Error alternando like en historia");
        }
      });

      return {
        toggleLikeStory,
        isTogglingLikeStory
      }
    },

    /** Eliminar un story */
    deletStory: (storyId: string) => {
      const { data, mutate: deleteStory, isPending, isSuccess, isError } = useMutation({
        mutationKey: ["deleteStory"],
        mutationFn: async () => {
          const token = await getToken();

          return axiosInstance<{ data: { message: string } }>({
            method: "DELETE",
            url: `/stories/${storyId}`,
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
        },
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["stories"] });
        },
        onError: (error) => {
          const message = errorMessage(error);
          toast.error(message);
        }
      });

      return {
        deleteStory,
        isPending,
        isSuccess,
        isError
      }
    }
  }
}