import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import Masonry from "react-responsive-masonry";
import { RotateCw, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import PostCard from "@/components/posts/PostCard";
import PostCardSkeleton from "@/components/posts/PostCardSkeleton";
import { Button } from "@/components/ui/button";
import useIntersectionObserver from "@/hooks/useIntersectionObserver";
import { axiosInstance } from "@/utils/axiosInstance";
import type { PostWithLikes, UserType } from "@/types/global";

interface Props {
  userData: UserType | null;
}

const PostsTabContent = ({userData}: Props) => {
  const paginationRef = useRef<HTMLDivElement>(null);

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [fetchingFirstPostsPage, setFetchingFirstPostsPage] = useState(true);

  // Actualizar el state del ancho del viewport
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    ;}

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    }
  }, []);

  const {getToken} = useAuth();

  const getUserPosts = async (page: number) => {
    const token = await getToken();
    
    const {data} = await axiosInstance<{
      data: PostWithLikes[];
      hasMore: boolean;
      nextPage: number | null;
    }>({
      method: "GET",
      url: `/posts/user/${userData?._id}`,
      params: {
        page,
        limit: 5
      },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (page === 1) {
      setFetchingFirstPostsPage(false);
    }

    return data;
  }

  const {data, error, isLoading, isRefetching, isFetchingNextPage, hasNextPage, fetchNextPage, refetch} = useInfiniteQuery({
    queryKey: ["posts", userData?.clerkId],
    queryFn: ({pageParam}) => getUserPosts(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
    refetchOnWindowFocus: false,
    enabled: !!userData,
    retry: 2,
  });

  const {isIntersecting} = useIntersectionObserver({
    data,
    paginationRef,
  });

  // Obtener la siguiente página de posts cuando la referencia de la paginación sea visible
  useEffect(() => {
    if (isIntersecting && hasNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage]);

  if (error) {
    toast.error("Error al obtener los posts.");
  }

  const postsData = data?.pages.flatMap((page) => page.data) ?? [];
  const loadingPosts = fetchingFirstPostsPage || isLoading || isFetchingNextPage;

  return (
    <section className="flex flex-col gap-6 w-full mx-auto">
      {!loadingPosts && error &&
        <div className="flex flex-col justify-center items-center gap-4">
          <div className="flex justify-center items-center gap-3">
            <TriangleAlert className="size-9 shrink-0 text-orange-600" />
            <p className="text-center text-lg text-neutral-700">
              Error al obtener los posts del usuario.
            </p>
          </div>

          <Button
            className="text-white bg-[#4F39F6] hover:bg-[#331fcf] cursor-pointer"
            disabled={isRefetching}
            onClick={() => refetch()}
          >
            <RotateCw aria-hidden />
            Intentar nuevamente
          </Button>
        </div>
      }

      {!loadingPosts && postsData.length > 0 &&
        <Masonry
          className="w-full"
          columnsCount={windowWidth >= 1000 ? 2 : 1}
          gutter="16px"
        >
          {postsData.map((post) => (
            <PostCard key={post._id} postData={post} />
          ))}
        </Masonry>
      }

      <div className="grid grid-cols-1 min-[1000px]:grid-cols-2 gap-4 w-full">
        {loadingPosts && [...Array(6)].map((_, index) => (
          <PostCardSkeleton key={index} />
        ))}

        {isFetchingNextPage && [...Array(6)].map((_, index) => (
          <PostCardSkeleton key={index} />
        ))}
      </div>

      {!loadingPosts && userData && postsData.length === 0 &&
        <p className="text-center text-lg text-neutral-700">
          No se encontraron publicaciones.
        </p>
      }

      {hasNextPage && !isFetchingNextPage && 
        <div ref={paginationRef} className="w-full h-4 shrink-0"/>
      }
    </section>
  )
}

export default PostsTabContent