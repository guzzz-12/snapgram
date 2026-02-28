import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { searchPosts, searchUsers } from "@/repositories/searchRepository";
import { useSearchStatus } from "@/hooks/useSearchStatus";

type SearchUsersProps = {
  searchTerm: string | null;
  searchType: "people" | "posts" | null;
}

/**
 * Servicios de busqueda de usuarios y posts.
 * Debe ser invocado en el top level del componente.
 */
export const useSearchService = () => {
  const {setIsSearching, setSearchType} = useSearchStatus();

  const {getToken} = useAuth();

  return {
    /** Buscar usuarios a traves del término de búsqueda */
    searchUsers: ({searchTerm, searchType}: SearchUsersProps) => {
      const res = useInfiniteQuery({
        queryKey: ["search", searchTerm, "users"],
        queryFn: ({pageParam}) => searchUsers({page: pageParam, keyword: searchTerm, getToken, setIsSearching, setSearchType}),
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
    },

    /** Buscar posts a traves del término de búsqueda */
    searchPosts: ({searchTerm, searchType}: SearchUsersProps) => {
      const res = useInfiniteQuery({
        queryKey: ["search", searchTerm, "posts"],
        queryFn: ({pageParam}) => searchPosts({page: pageParam, keyword: searchTerm, getToken, setIsSearching, setSearchType}),
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
  }
}