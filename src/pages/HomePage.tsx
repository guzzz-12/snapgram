import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { IoFileTrayStackedOutline } from "react-icons/io5";
import { MdOutlineExplore } from "react-icons/md";
import { toast } from "sonner";
import PostCard from "@/components/posts/PostCard";
import StoriesSlider from "@/components/stories/StoriesSlider";
import PostCardSkeleton from "@/components/posts/PostCardSkeleton";
import RightSidebar from "@/components/RightSidebar";
import NewUserScreen from "@/components/home/NewUserScreen";
import { Separator } from "@/components/ui/separator";
import { usePostsService } from "@/services/postsService";
import useIntersectionObserver from "@/hooks/useIntersectionObserver";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";

const HomePage = () => {
  const paginationRef = useRef<HTMLDivElement>(null);

  const [followingCount, setFollowingCount] = useState(0);

  const {getToken} = useAuth();

  const {getFeedPosts} = usePostsService();

  // Consultar los posts del feed del usuario
  const {posts, loadingPosts, isFetchingNextPage, error, hasNextPage, fetchNextPage} = getFeedPosts();

  const {isIntersecting} = useIntersectionObserver({ data: posts, paginationRef });

  // Consultar la siguiente página de posts al scrollear al bottom
  useEffect(() => {
    if (isIntersecting && hasNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage]);

  // Consultar el número de seguidos del usuario
  const {data: followingCountData, isLoading: loadingFollowingCount} = useQuery({
    queryKey: ["following-count"],
    queryFn: async () => {
      const token = await getToken();

      const {data} = await axiosInstance<{data: number}>({
        method: "GET",
        url: "/follows/get-following-count",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return data;
    }
  });

  useEffect(() => {
    if (followingCountData) {
      setFollowingCount(followingCountData.data);
    }
  }, [followingCountData]);

  if (error) {
    toast.error(errorMessage(error));
  }

  return (
    <main className="pageWrapper ">
      <div className="w-full max-w-[800px] h-full mx-auto shrink-[2]">
        <StoriesSlider />

        {/* Mostrar esta pantalla si el usuario no sigue a nadie y no tiene posts */}
        {!loadingFollowingCount && followingCount === 0 && posts.length === 0 && !loadingPosts &&
          <NewUserScreen />
        }

        {/* Mostrar esta pantalla si el usuario está siguiendo a otros pero no hay posts */}
        {!loadingFollowingCount && followingCount > 0 && posts.length === 0 && !loadingPosts &&
          <>
            <div className="flex justify-center items-start w-full h-full max-w-[500px] mx-auto">
              <div className="flex flex-col justify-center items-center w-full p-10 bg-white rounded-lg">
                <IoFileTrayStackedOutline className="mb-2 size-[100px] text-[#4F39F6] [&>path]:stroke-[15px]"/>

                <h1 className="text-2xl text-center text-neutral-700">
                  No hay publicaciones disponibles
                </h1>

                <Separator className="w-full my-4" />

                <p className="mb-3 text-center text-neutral-600 leading-tight">
                  Explora y descubre contenido popular y cuentas <br /> que se adapten a tus pasiones.
                </p>

                <Link
                  className="flex justify-center items-center gap-1 w-full px-4 py-2 text-sm text-white uppercase rounded-full bg-[#4F39F6] hover:bg-[#4F39F6]/60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                  to="/discover"
                >
                  <MdOutlineExplore className="size-[27px] text-neutral-50" />
                  Explorar
                </Link>
              </div>
            </div>
          </>
        }
        
        <section className="flex flex-col gap-6 w-full max-w-[650px] mx-auto">
          {loadingPosts &&
            Array(2).fill(0).map((_, i) => (
              <PostCardSkeleton key={i} />
            ))
          }

          {posts.map((post) => (
            <PostCard key={post._id} postData={post} />
          ))}

          {isFetchingNextPage &&
            Array(2).fill(0).map((_, i) => (
              <PostCardSkeleton key={i} />
            ))
          }

          {hasNextPage && (
            <div ref={paginationRef} className="w-full h-4 shrink-0"/>
          )}
        </section>
      </div>

      <RightSidebar />
    </main>
  )
}

export default HomePage