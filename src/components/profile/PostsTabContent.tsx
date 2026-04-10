import { useEffect, useRef } from "react";
import Masonry from "react-responsive-masonry";
import { RotateCw, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import PostCard from "@/components/posts/PostCard";
import PostCardSkeleton from "@/components/posts/PostCardSkeleton";
import { Button } from "@/components/ui/button";
import { useGetUserPosts } from "@/services/profile";
import { useEditPost } from "@/services/posts";
import useIntersectionObserver from "@/hooks/useIntersectionObserver";
import useWindowWidth from "@/hooks/useWindowWidth";
import type { UserType } from "@/types/global";

interface Props {
  userData: UserType | null;
}

const PostsTabContent = ({userData}: Props) => {
  const paginationRef = useRef<HTMLDivElement>(null);

  const {windowWidth} = useWindowWidth();

  const {mutate: editPost, isPending} = useEditPost();

  const {
    data: postsData,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isRefetching,
    error,
    fetchNextPage,
    refetch
  } = useGetUserPosts(userData);

  const {isIntersecting} = useIntersectionObserver({
    data: postsData,
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

  return (
    <section className="flex flex-col gap-6 w-full mx-auto p-2 pb-0 bg-slate-100">
      {!isLoading && error &&
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

      {!isLoading && postsData.length > 0 &&
        <Masonry
          className="w-full"
          columnsCount={windowWidth >= 750 ? 2 : 1}
          gutter="8px"
        >
          {postsData.map((post) => (
            <PostCard
              key={post._id}
              postData={post}
              editPost={editPost}
              isPending={isPending}
            />
          ))}
        </Masonry>
      }

      <div className="grid grid-cols-1 min-[1000px]:grid-cols-2 gap-4 w-full">
        {(isLoading || isFetchingNextPage) && [...Array(6)].map((_, index) => (
          <PostCardSkeleton key={index} />
        ))}
      </div>

      {!isLoading && userData && postsData.length === 0 &&
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