import { useInfiniteQuery } from "@tanstack/react-query";
import { useSearchStatus } from "@/hooks/useSearchStatus";
import { searchUsers } from "@/repositories/searchRepository";

type SearchProps = {
  searchTerm: string | null;
  searchType: "people" | "posts" | null;
}

/** Hook para buscar usuarios especificando el término de búsqueda */
const useSearchUsers = ({searchTerm, searchType}: SearchProps) => {
  const {setIsSearching, setSearchType} = useSearchStatus();

  const res = useInfiniteQuery({
    queryKey: ["search", searchTerm, "users"],
    queryFn: ({pageParam}) => searchUsers({page: pageParam, keyword: searchTerm, setIsSearching, setSearchType}),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
    refetchOnWindowFocus: false,
    retry: 2,
    enabled: !!searchTerm && searchType === "people"
  });

  const {data, error, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage} = res;

  const searchUsersResults = data?.pages.flatMap(page => page.data) || [];

  return {
    data: searchUsersResults,
    error,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage
  }
}

export default useSearchUsers;