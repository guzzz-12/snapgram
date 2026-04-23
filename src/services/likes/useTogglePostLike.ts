import { useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "@/utils/axiosInstance";
import { toast } from "sonner";
import { errorMessage } from "@/utils/errorMessage";

type Props = {
  postId: string;
  searchTerm: string;
}

/** Alternar el like en un post */
const useTogglePostLike = (props: Props) => {
  const {postId, searchTerm} = props;

  const queryClient = useQueryClient();

  const {mutate: togglePostLikeMutation, isPending} = useMutation({
    mutationFn: async () => {
      return axiosInstance({
        method: "POST",
        url: `/likes/post/${postId}`
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ["posts"]});
      await queryClient.invalidateQueries({queryKey: ["posts", postId]});
      await queryClient.invalidateQueries({queryKey: ["likes", "likedPosts"]});
      
      if (searchTerm) {
        await queryClient.invalidateQueries({queryKey: ["search", searchTerm, "posts"]});
      }
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    }
  });

  return {
    togglePostLikeMutation,
    isPending
  };
}

export default useTogglePostLike;