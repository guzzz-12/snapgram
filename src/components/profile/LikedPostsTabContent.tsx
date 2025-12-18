import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import Masonry from "react-responsive-masonry";
import { RotateCw, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import PostCard from "../posts/PostCard";
import PostCardSkeleton from "../posts/PostCardSkeleton";
import useWindowWidth from "@/hooks/useWindowWidth";
import useIntersectionObserver from "@/hooks/useIntersectionObserver";
import { axiosInstance } from "@/utils/axiosInstance";
import type { PostWithLikes, UserType } from "@/types/global";

interface Props {
  userData: UserType;
}

const LikedPostsTabContent = ({userData}: Props) => {
  const paginationRef = useRef<HTMLDivElement>(null);

  const {getToken} = useAuth();

  const {windowWidth} = useWindowWidth();

  const getUserLikedPosts = async (page: number) => {
    const token = await getToken();

    const {data} = await axiosInstance<{
      data: PostWithLikes[];
      hasMore: boolean;
      nextPage: number | null;
    }>({
      method: "GET",
      url: "/likes/liked-posts",
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: {
        page,
        limit: 10
      }
    });

    return data;
  }

  // Query para consultar los posts gustados del usuario
  const {data, error, isLoading, isRefetching, isFetchingNextPage, hasNextPage, fetchNextPage, refetch} = useInfiniteQuery({
    queryKey: ["likes", "likedPosts"],
    queryFn: ({pageParam}) => getUserLikedPosts(pageParam),
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
    const loadingPosts = isLoading || isFetchingNextPage;

  return (
    <section className="flex flex-col gap-6 w-full mx-auto p-2 pb-0 bg-slate-100">
      {!loadingPosts && error &&
        <div className="flex flex-col justify-center items-center gap-4">
          <div className="flex justify-center items-center gap-3">
            <TriangleAlert className="size-9 shrink-0 text-orange-600" />
            <p className="text-center text-lg text-neutral-700">
              Error al cargar los me gusta.
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
          columnsCount={windowWidth >= 750 ? 2 : 1}
          gutter="8px"
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
          No tienes posts gustados.
        </p>
      }

      {hasNextPage && !isFetchingNextPage && 
        <div ref={paginationRef} className="w-full h-4 shrink-0"/>
      }
    </section>
  )
}

export default LikedPostsTabContent