import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { axiosInstance } from "@/utils/axiosInstance";
import type { Comment } from "@/types/global";

type PaginatedReplies = {
  data: Comment[];
  hasMore: boolean;
  nextPage: number | null;
}

/** Consultar y paginar las respuestas de un comentario */
const useGetCommentReplies = (commentId: string, openReplies: boolean) => {
  const {getToken} = useAuth();

  const res = useInfiniteQuery({
    queryKey: ["commentReplies", commentId],
    queryFn: async ({ pageParam }) => {
      const token = await getToken();

      const {data} = await axiosInstance<PaginatedReplies>({
        method: "GET",
        url: `/comments/replies/comment/${commentId}`,
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
    enabled: openReplies,
    refetchOnWindowFocus: false,
    staleTime: 0
  });

  const {data: repliesData, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} = res;

  const commentReplies = repliesData?.pages.flatMap((page) => page.data) ?? [];

  return {
    commentReplies,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage
  }
}

export default useGetCommentReplies;