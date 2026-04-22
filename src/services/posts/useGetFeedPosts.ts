import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchPosts } from "@/repositories/postsRepository";

/** Hook para consultar y paginar los posts del feed del usuario */
const useGetFeedPosts = () => {
  const res = useInfiniteQuery({
    queryKey: ["posts"],
    queryFn: ({pageParam}) => fetchPosts(pageParam),
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
}

export default useGetFeedPosts