import { useAuth } from "@clerk/clerk-react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "@/utils/axiosInstance";
import { toast } from "sonner";
import { errorMessage } from "@/utils/errorMessage";
import type { UsersHavingStories, UserWithStories } from "@/types/global";

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

    /** Consultar las stories de un usuario mediante su username */
    getUserStories: (username: string | null) => {
      const { data: storiesUserData, isLoading, error } = useQuery({
        queryKey: ["stories", username],
        queryFn: async () => {
          const token = await getToken();

          const { data } = await axiosInstance<{ data: UserWithStories }>({
            method: "GET",
            url: `/stories/${username}`,
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          return data.data;
        },
        enabled: !!username,
      });

      return {
        data: storiesUserData,
        isLoading,
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

    /** Eliminar un story */
    deletStory: (storyId: string) => {
      const { mutate: deleteStory, isPending, isSuccess, isError } = useMutation({
        mutationKey: ["deleteStory"],
        mutationFn: async () => {
          const token = await getToken();

          return axiosInstance({
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