import { useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { toast } from "sonner";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import type { PostWithLikes } from "@/types/global";

export type EditPostProps = {
  postData: PostWithLikes;
  updatedTextContent: string;
  searchTerm: string | null;
  onSuccess?: () => void;
};

type PaginatedPostsPage = {
  data: PostWithLikes[];
  hasMore: boolean;
  nextPage: number | null;
};

/** Hook para editar un post */
const useEditPost = () => {
  const queryClient = useQueryClient();

  const {mutate, isPending} = useMutation({
    mutationFn: async (params: EditPostProps) => {
      const {postData, updatedTextContent} = params;

      if (!postData) return;

      return axiosInstance<{data: PostWithLikes}>({
        method: "PUT",
        url: `/posts/${postData._id}`,
        data: {
          content: updatedTextContent
        },
        headers: {
          "Content-Type": "application/json"
        }
      });
    },
    onSuccess: async (response, vars) => {
      const updatedContent = response?.data?.data?.content ?? vars.updatedTextContent;

      const updatePostInInfinitePages = (
        oldData: InfiniteData<PaginatedPostsPage> | undefined
      ): InfiniteData<PaginatedPostsPage> | undefined => {
        if (!oldData?.pages) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            data: page.data.map((post) =>
              post._id === vars.postData._id
                ? { ...post, content: updatedContent }
                : post
            )
          }))
        };
      };

      // Actualizar las páginas en caché sin re-descargar todo el feed
      queryClient.setQueriesData<InfiniteData<PaginatedPostsPage>>(
        { queryKey: ["posts"] },
        updatePostInInfinitePages
      );

      queryClient.setQueriesData<InfiniteData<PaginatedPostsPage>>(
        { queryKey: ["likes", "likedPosts"] },
        updatePostInInfinitePages
      );

      // Actualizar detalle individual del post si está en caché
      queryClient.setQueryData<PostWithLikes>(
        ["post", vars.postData._id],
        (oldPost) => (oldPost ? { ...oldPost, content: updatedContent } : oldPost)
      );

      if (vars.searchTerm) {
        await queryClient.invalidateQueries({
          queryKey: ["search", vars.searchTerm, "posts"]
        });
      }

      vars.onSuccess?.();
    },
    onError: (error) => {
      const message = errorMessage(error);
      toast.error(message);
    }
  });

  return {
    mutate,
    isPending
  };
};

export default useEditPost;