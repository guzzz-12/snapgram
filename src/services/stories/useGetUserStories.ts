import { useQuery } from "@tanstack/react-query";
import type { UserWithStories } from "@/types/global";
import { axiosInstance } from "@/utils/axiosInstance";


/**
 * Hook para consultar las historias de un usuario mediante su username.
 * Si se especifica un storyId, se consulta una sola historia.
 * Si no se especifica un storyId, se consultan todas las historias.
*/
const useGetUserStories = (username: string | null, storyId?: string | null) => {
  const { data: storiesUserData, isLoading, error, isSuccess } = useQuery({
    queryKey: ["stories", username],
    queryFn: async () => {
      const { data } = await axiosInstance<{ data: UserWithStories | null }>({
        method: "GET",
        url: `/stories/${username}`,
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
}

export default useGetUserStories;