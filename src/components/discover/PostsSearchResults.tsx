import { useEffect, useRef, useState, type RefObject } from "react";
import Masonry from "react-responsive-masonry";
import { toast } from "sonner";
import PostCardSkeleton from "@/components/posts/PostCardSkeleton";
import PostCard from "@/components/posts/PostCard";
import NoResults from "./NoResults";
import { useSearchService } from "@/services/searchService";
import { useEditPost } from "@/services/posts";
import useIntersectionObserver from "@/hooks/useIntersectionObserver";
import { errorMessage } from "@/utils/errorMessage";

interface Props {
  searchTerm: string | null;
  searchType: "people" | "posts" | null;
  setTerm: (term: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
}

const PostsSearchResults = (props: Props) => {
  const {
    searchTerm,
    searchType,
    setTerm,
    searchInputRef,
  } = props;

  const paginationRef = useRef<HTMLDivElement | null>(null);

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    ;}

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    }
  }, []);

  const {searchPosts} = useSearchService();

  const {mutate: editPost, isPending} = useEditPost();

  const {
    data,
    totalResults,
    error,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage
  } = searchPosts({searchTerm, searchType});

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

  if (searchType !== "posts") return null;

  return (
    <>
      {!isLoading && totalResults > 0 &&
        <div className="w-full -mb-[10px]">
          <p className="text-neutral-600">
            Se {totalResults === 1 ? "encontró" : "encontraron"} {totalResults} {totalResults === 1 ? "publicación" : "publicaciones"} para el término <span className="font-semibold">"{searchTerm}"</span>
          </p>
        </div>
      }

      {data.length > 0 &&
        <Masonry
          className="w-full"
          columnsCount={windowWidth >= 1000 ? 2 : 1}
          gutter="16px"
        >
          {!isLoading && data.map((post) => {
            return (
              <PostCard
                key={post._id}
                postData={post}
                editPost={editPost}
                isPending={isPending}
              />
            )
          })}
        </Masonry>
      }

      <div className="grid grid-cols-1 min-[1100px]:grid-cols-2 gap-4 w-full">
        {isLoading && [...Array(6)].map((_, index) => (
          <PostCardSkeleton key={index} />
        ))}

        {isFetchingNextPage && [...Array(6)].map((_, index) => (
          <PostCardSkeleton key={index} />
        ))}

        {hasNextPage && !isFetchingNextPage &&
          <div ref={paginationRef} className="w-full h-10" />
        }
      </div>

      {data.length > 0 && !hasNextPage &&
        <div className="w-full mt-auto pt-2 border-t border-[#4F39F6]/20">
          <p className="w-full text-center text-neutral-600 text-sm">
            Fin de los resultados
          </p>
        </div>
      }

      {searchTerm && !isLoading && data.length === 0 &&
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

export default PostsSearchResults