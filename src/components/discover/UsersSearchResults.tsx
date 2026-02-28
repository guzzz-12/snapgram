import { useEffect, useRef, type RefObject } from "react";
import { toast } from "sonner";
import SearchUserCardSkeleton from "./SearchUserCardSkeleton";
import ResultUserCard from "./ResultUserCard";
import NoResults from "./NoResults";
import useIntersectionObserver from "@/hooks/useIntersectionObserver";
import { useSearchService } from "@/services/searchService";
import { errorMessage } from "@/utils/errorMessage";

interface Props {
  searchTerm: string | null;
  searchType: "people" | "posts" | null;
  setTerm: (term: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
}

const UsersSearchResults = (props: Props) => {
  const {
    searchTerm,
    searchType,
    setTerm,
    searchInputRef,
  } = props;

  const paginationRef = useRef<HTMLDivElement | null>(null);

  const {searchUsers} = useSearchService();

  const {
    data,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    error,
    fetchNextPage
  } = searchUsers({searchTerm, searchType});

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

  if (searchType && searchType !== "people") return null;

  return (
    <>
      <div className="grid grid-cols-1 min-[600px]:grid-cols-2 min-[768px]:grid-cols-1 min-[920px]:grid-cols-2 min-[1100px]:grid-cols-3 gap-4 w-full">
        {isLoading && [...Array(6)].map((_, index) => (
          <SearchUserCardSkeleton key={index} />
        ))}

        {!isLoading && data.map(user => {
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

      {searchTerm && searchType && !isLoading && data.length === 0 &&
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