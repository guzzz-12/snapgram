import { useEffect, useRef, useState } from "react";
import { Navigate, useParams } from "react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { RotateCw, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import PostCard from "@/components/posts/PostCard";
import ProfileHeader from "@/components/profile/ProfileHeader";
import PostCardSkeleton from "@/components/posts/PostCardSkeleton";
import ProfileHeaderSkeleton from "@/components/posts/ProfileHeaderSkeleton";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { axiosInstance } from "@/utils/axiosInstance";
import type { PostType, UserType } from "@/types/global";

const ProfilePage = () => {
  const paginationRef = useRef<HTMLDivElement>(null);

  const {userClerkId} = useParams<{userClerkId: string}>();

  const [isIntersecting, setIsIntersecting] = useState(false);

  const {getToken} = useAuth();

  const getUser = async () => {
    const token = await getToken();

    const {data} = await axiosInstance<{data: UserType}>({
      method: "GET",
      url: `/users/${userClerkId}`,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return data.data;
  }

  const getUserPosts = async (page: number) => {
    const token = await getToken();
    
    const {data} = await axiosInstance<{
      data: PostType[];
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

    return data;
  }

  const {data: userData, isLoading: loadingUser, error: userError} = useQuery({
    queryKey: ["user", userClerkId],
    queryFn: getUser,
    enabled: !!userClerkId
  });

  const {data, error, isLoading, isRefetching, isFetchingNextPage, hasNextPage, fetchNextPage, refetch} = useInfiniteQuery({
    queryKey: ["posts", userClerkId],
    queryFn: ({pageParam}) => getUserPosts(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
    refetchOnWindowFocus: false,
    enabled: !!userData,
    retry: 2,
  });

  // Observar si la referencia de la paginación es visible en el viewport
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      setIsIntersecting(entries[0].isIntersecting);
    }, {threshold: 0.5});

    if (paginationRef.current) {
      observer.observe(paginationRef.current);
    }

    return () => {
      if (paginationRef.current) {
        observer.unobserve(paginationRef.current);
      }
    }
  }, [data]);

  // Obtener la siguiente página de posts cuando la referencia de la paginación sea visible
  useEffect(() => {
    if (isIntersecting && hasNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage]);

  if (!loadingUser && !userData) {
    toast.error("Usuario no encontrado.");
    return <Navigate to="/" replace />
  }

  if (userError) {
    toast.error("Error al obtener el usuario.");
  }

  if (error) {
    toast.error("Error al obtener los posts.");
  }

  const postsData = data?.pages.flatMap((page) => page.data) ?? [];
  const loadingPosts = isLoading || isFetchingNextPage;

  return (
    <main className="w-full min-h-screen mx-auto p-6 bg-slate-200">
      <SidebarTrigger className="absolute block md:hidden top-4 left-4 cursor-pointer z-10" />

      <section className="w-full max-w-[800px] mx-auto mb-10">
        {loadingUser &&
          <ProfileHeaderSkeleton />
        }

        {!loadingUser && userData &&
          <ProfileHeader userData={userData} />
        }
      </section>

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
    </main>
  );
}

export default ProfilePage