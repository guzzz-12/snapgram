import { useEffect, useRef, type RefObject } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import SearchUserCardSkeleton from "./SearchUserCardSkeleton";
import ResultUserCard from "./ResultUserCard";
import NoResults from "./NoResults";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import useIntersectionObserver from "@/hooks/useIntersectionObserver";
import type { SearchUsersResult } from "@/types/global";

interface Props {
  searchTerm: string | null;
  searchType: "people" | "posts" | null;
  setTerm: (term: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  setIsSearchingUsers: (isSearchingUsers: boolean) => void;
}

const UsersSearchResults = (props: Props) => {
  const {
    searchTerm,
    searchType,
    setTerm,
    searchInputRef,
    setIsSearchingUsers
  } = props;

  const paginationRef = useRef<HTMLDivElement | null>(null);

  const { getToken } = useAuth();

  const searchUsers = async (page: number, keyword: string | null | undefined) => {
    setIsSearchingUsers(true);

    const token = await getToken();

    const {data} = await axiosInstance<{
      data: SearchUsersResult[];
      hasMore: boolean;
      nextPage: number | null;
    }>({
      method: "GET",
      url: "/search/search-users",
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: {
        page,
        keyword,
        limit: 10
      }
    });

    setIsSearchingUsers(false);

    return data;
  }

  const {
    data,
    error,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage
  } = useInfiniteQuery({
    queryKey: ["search", searchTerm, "users"],
    queryFn: ({pageParam}) => searchUsers(pageParam, searchTerm),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
    refetchOnWindowFocus: false,
    retry: 2,
    enabled: !!searchTerm && searchType === "people"
  });

  const {isIntersecting} = useIntersectionObserver({data, paginationRef});

  useEffect(() => {
    if (isIntersecting) {
      fetchNextPage();
    }
  }, [isIntersecting]);

  if (error) {
    const message = errorMessage(error);
    toast.error(message);
  }

  const searchUsersResults = data?.pages.flatMap(page => page.data) || [];

  if (searchType && searchType !== "people") return null;

  return (
    <>
      <div className="grid grid-cols-1 min-[600px]:grid-cols-2 min-[768px]:grid-cols-1 min-[920px]:grid-cols-2 min-[1100px]:grid-cols-3 gap-4 w-full">
        {isLoading && [...Array(6)].map((_, index) => (
          <SearchUserCardSkeleton key={index} />
        ))}

        {!isLoading && searchUsersResults.map(user => {
          return (
            <ResultUserCard
              key={user._id}
              userData={user}
            />
          )
        })}

        {isFetchingNextPage && [...Array(6)].map((_, index) => (
          <SearchUserCardSkeleton key={index} />
        ))}

        {hasNextPage && !isFetchingNextPage &&
          <div ref={paginationRef} className="w-full h-10" />
        }
      </div>

      {searchTerm && searchType && !isLoading && searchUsersResults.length === 0 &&
        <NoResults
          term={searchTerm}
          searchType={searchType}
          setTerm={(term) => setTerm(term)}
          searchInputRef={searchInputRef}
        />
      }
    </>
  )
}

export default UsersSearchResults