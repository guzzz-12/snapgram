import { useMutation } from "@tanstack/react-query";
import { axiosInstance } from "@/utils/axiosInstance";

/** Hook para marcar una historia como vista */
const useMarkStoryAsSeen = (storyId: string) => {
  const { mutate: markStoryAsSeen, isPending: isMarkingStoryAsSeen } = useMutation({
    mutationFn: async () => {
      return axiosInstance({
        method: "PUT",
        url: `/stories/seen/${storyId}`
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