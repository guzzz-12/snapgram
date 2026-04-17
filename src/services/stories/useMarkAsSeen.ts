import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { axiosInstance } from "@/utils/axiosInstance";

/** Hook para marcar una historia como vista */
const useMarkStoryAsSeen = (storyId: string) => {
  const { getToken } = useAuth();

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
}

export default useMarkStoryAsSeen;