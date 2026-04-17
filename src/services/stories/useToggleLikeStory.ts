import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import type { StoryType, UserWithStories } from "@/types/global";
import { axiosInstance } from "@/utils/axiosInstance";


/** Hook para alternar el like en un story */
const useToggleLikeStory = (
  storyId: string,
  username: string | null,
  currentUserId: string | undefined
) => {
  const { getToken } = useAuth();

  const queryClient = useQueryClient();

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
}

export default useToggleLikeStory;