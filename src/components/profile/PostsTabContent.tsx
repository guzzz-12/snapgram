import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
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

  const [fetchingFirstPostsPage, setFetchingFirstPostsPage] = useState(true);

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
    <section className="flex flex-col gap-6 w-full max-w-[600px] mx-auto">
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

      {loadingPosts &&
        Array(3).fill(0).map((_, i) => (
          <PostCardSkeleton key={i} />
        ))
      }

      {!loadingPosts && postsData.length > 0 &&
        postsData.map((post) => (
          <PostCard key={post._id} postData={post} />
        ))
      }

      {!loadingPosts && userData && postsData.length === 0 &&
        <p className="text-center text-lg text-neutral-700">
          No se encontraron publicaciones.
        </p>
      }

      {hasNextPage && (
        <div ref={paginationRef} className="w-full h-4 shrink-0"/>
      )}
    </section>
  )
}

export default PostsTabContent