import { useInfiniteQuery } from "@tanstack/react-query";
import { useSearchStatus } from "@/hooks/useSearchStatus";
import { searchPosts } from "@/repositories/searchRepository";

type SearchProps = {
  searchTerm: string | null;
  searchType: "people" | "posts" | null;
}

/** Hook para buscar posts a traves del término de búsqueda */
const useSearchPosts = ({searchTerm, searchType}: SearchProps) => {
  const {setIsSearching, setSearchType} = useSearchStatus();

  const res = useInfiniteQuery({
    queryKey: ["search", searchTerm, "posts"],
    queryFn: ({pageParam}) => searchPosts({page: pageParam, keyword: searchTerm, setIsSearching, setSearchType}),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
    refetchOnWindowFocus: false,
    retry: 2,
    enabled: !!searchTerm && searchType === "posts"
  });

  const {data, error, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage} = res;

  const searchPostsResults = data?.pages.flatMap(page => page.data) || [];
  const totalResults = data?.pages[0].totalResults || 0;

  return {
    data: searchPostsResults,
    totalResults,
    error,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage
  }
}

export default useSearchPosts;