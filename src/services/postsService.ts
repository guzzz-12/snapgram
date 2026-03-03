import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { fetchPosts, getComments, getPost } from "@/repositories/postsRepository";

type GetPostProps = {
  postId: string | undefined;
}

type GetPostCommentsProps = {
  postId: string | undefined;
  enabled: boolean;
}

/**
 * Servicios de posts.
 * Debe ser invocado en el top level del componente.
*/
export const usePostsService = () => {
  const { getToken } = useAuth();

  return {
    /** Consultar un post mediante su ID */
    getPostById: ({postId}: GetPostProps) => {
      return useQuery({
        queryKey: ["posts", postId],
        queryFn: async () => getPost({postId, getToken}),
        enabled: !!postId,
        refetchOnWindowFocus: false,
        retry: 1
      });
    },

    /** Consultar y paginar los posts del feed del usuario */
    getFeedPosts: () => {
      const res = useInfiniteQuery({
        queryKey: ["posts"],
        queryFn: ({pageParam}) => fetchPosts(pageParam, getToken),
        initialPageParam: 1,
        getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
        refetchOnWindowFocus: false
      });

      const {data, error, isLoading: loadingPosts, isFetchingNextPage, hasNextPage, fetchNextPage} = res;

      const posts = data?.pages.flatMap(page => page.data) || [];

      return {
        posts,
        error,
        loadingPosts,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage
      }
    },

    /** Consultar y paginar los comentarios de un post */
    getPostComments: ({postId, enabled}: GetPostCommentsProps) => {
      const {data: commentsData, error: commentsError, isLoading: isLoadingComments, isFetchingNextPage, hasNextPage, fetchNextPage} = useInfiniteQuery({
        queryKey: ["postComments", postId],
        queryFn: async ({ pageParam }) => getComments({postId, page: pageParam, getToken}),
        initialPageParam: 1,
        getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
        refetchOnWindowFocus: false,
        enabled
      });

      const comments = commentsData?.pages.flatMap(page => page.data) || [];
      const loadingComments = isLoadingComments || isFetchingNextPage;

      return {
        comments,
        commentsError,
        loadingComments,
        hasNextPage,
        fetchNextPage
      }
    },
  }
}