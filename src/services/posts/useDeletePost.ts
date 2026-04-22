import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";

type DeletePostProps = {
  postId: string;
  pathname: string | undefined;
  searchTerm: string | null;
  onSuccess?: () => void;
}

/** Hook para eliminar un post */
const useDeletePost = () => {
  const navigate = useNavigate();

  const queryClient = useQueryClient();

  const {mutate, isPending} = useMutation({
    mutationFn: async (params: DeletePostProps) => {

      return axiosInstance({
        method: "DELETE",
        url: `/posts/${params.postId}`
      });
    },
    onSuccess: async (_data, vars) => {
      vars.onSuccess?.();

      // Si se está en la página del post, redirigir a la página principal
      if (vars.pathname === `/post/${vars.postId}`) {
        navigate("/", {replace: true});

      } else {
        // Invalidar los queries de los posts
        await queryClient.invalidateQueries({queryKey: ["posts"]});

        if (vars.searchTerm) {
          await queryClient.invalidateQueries({queryKey: ["search", vars.searchTerm, "posts"]});
        }
      }
    },
    onError: (error) => {
      const message = errorMessage(error);
      toast.error(message);
    }
  });

  return {
    mutate,
    isPending
  }
}

export default useDeletePost;