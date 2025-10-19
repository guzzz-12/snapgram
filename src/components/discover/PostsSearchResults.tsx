import { useEffect, useRef, type RefObject } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import PostCardSkeleton from "@/components/posts/PostCardSkeleton";
import PostCard from "@/components/posts/PostCard";
import NoResults from "./NoResults";
import useIntersectionObserver from "@/hooks/useIntersectionObserver";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import type { PostWithLikes } from "@/types/global";

interface Props {
  searchTerm: string | null;
  filter: "users" | "posts";
  setTerm: (term: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  setIsSearchingUsers: (isSearchingUsers: boolean) => void;
}

const PostsSearchResults = (props: Props) => {
  const {
    searchTerm,
    filter,
    setTerm,
    searchInputRef,
    setIsSearchingUsers
  } = props;

  const paginationRef = useRef<HTMLDivElement | null>(null);

  const { getToken } = useAuth();

  const searchPosts = async (page: number, keyword: string | null | undefined) => {
    setIsSearchingUsers(true);

    const token = await getToken();

    const {data} = await axiosInstance<{
      data: PostWithLikes[];
      hasMore: boolean;
      nextPage: number | null;
    }>({
      method: "GET",
      url: "/search/search-posts",
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: {
        page,
        keyword,
        limit: 5
      }
    });

    setIsSearchingUsers(false);

    return data;
  }

  // Buscar publicaciones
  const {
    data,
    error,
    isLoading,
    isFetchingNextPage,
    fetchNextPage
  } = useInfiniteQuery({
    queryKey: ["search", searchTerm, "posts"],
    queryFn: ({pageParam}) => searchPosts(pageParam, searchTerm),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
    refetchOnWindowFocus: false,
    retry: 2,
    enabled: !!searchTerm && filter === "posts"
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

  const searchPostsResults = data?.pages.flatMap(page => page.data) || [];

  if (filter !== "posts") return null;

  return (
    <>
      <div className="grid grid-cols-1 min-[1100px]:grid-cols-2 gap-4 w-full">
        {isLoading && [...Array(6)].map((_, index) => (
          <PostCardSkeleton key={index} />
        ))}

        {!isLoading && searchPostsResults.map((post) => {
          return (
            <PostCard key={post._id} postData={post} />
          )
        })}

        {isFetchingNextPage && [...Array(6)].map((_, index) => (
          <PostCardSkeleton key={index} />
        ))}

        <div ref={paginationRef} className="w-full h-10" />
      </div>

      {searchTerm && !isLoading && searchPostsResults.length === 0 &&
        <NoResults
          term={searchTerm}
          searchType={filter}
          setTerm={(term) => setTerm(term)}
          searchInputRef={searchInputRef}
        />
      }
    </>
  )
}

export default PostsSearchResults