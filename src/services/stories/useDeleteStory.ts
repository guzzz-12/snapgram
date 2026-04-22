import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";

/** Hook para eliminar un story */
const useDeleteStory = (storyId: string) => {
  const queryClient = useQueryClient();

  const { data, mutate: deleteStory, isPending, isSuccess, isError } = useMutation({
    mutationKey: ["deleteStory"],
    mutationFn: async () => {
      return axiosInstance<{ data: { message: string } }>({
        method: "DELETE",
        url: `/stories/${storyId}`,
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

export default useDeleteStory;