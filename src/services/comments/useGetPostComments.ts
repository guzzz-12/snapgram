import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { axiosInstance } from "@/utils/axiosInstance";
import type { Comment } from "@/types/global";

/** Consultar y paginar los comentarios de un post */
const useGetPostComments = (props: {postId: string | undefined; enabled: boolean}) => {
  const {postId, enabled} = props;

  const {getToken} = useAuth();

  const res = useInfiniteQuery({
    queryKey: ["postComments", postId],
    queryFn: async ({ pageParam }) => {
      const token = await getToken();

      const {data} = await axiosInstance<{
        data: Comment[];
        hasMore: boolean;
        nextPage: number | null;
      }>({
        method: "GET",
        url: `/comments/posts/${postId}`,
        headers: {
          Authorization: `Bearer ${token}`
        },
        params: {
          page: pageParam,
          limit: 5
        }
      });

      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
    refetchOnWindowFocus: false,
    enabled
  });

  const {data, error, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} = res;

  const comments = data?.pages.flatMap(page => page.data) || [];
  const loadingComments = isLoading || isFetchingNextPage;

  return {
    comments,
    commentsError: error,
    loadingComments,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage
  }
}

export default useGetPostComments;