import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";

/** Hook para eliminar un story */
const useDeleteStory = (storyId: string) => {
  const { getToken } = useAuth();

  const queryClient = useQueryClient();

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

export default useDeleteStory;