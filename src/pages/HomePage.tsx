import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import PostCard from "@/components/posts/PostCard";
import StoriesSlider from "@/components/stories/StoriesSlider";
import PostCardSkeleton from "@/components/posts/PostCardSkeleton";
import { SidebarTrigger } from "@/components/ui/sidebar";
import RightSidebar from "@/components/RightSidebar";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import type { PostType } from "@/types/global";

const HomePage = () => {
  const paginationRef = useRef<HTMLDivElement>(null);

  const [isIntersecting, setIsIntersecting] = useState(false);

  const {getToken} = useAuth();

  const getPosts = async (page: number) => {
    const token = await getToken();

    const {data} = await axiosInstance<{
      data: PostType[];
      hasMore: boolean;
      nextPage: number | null;
    }>({
      method: "GET",
      url: "/posts",
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

  const {data, error, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} = useInfiniteQuery({
    queryKey: ["posts"],
    queryFn: ({pageParam}) => getPosts(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
    refetchOnWindowFocus: false
  });

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
  }, []);

  useEffect(() => {
    if (isIntersecting && hasNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage]);

  const posts = data?.pages.flatMap(page => page.data) || [];

  if (error) {
    toast.error(errorMessage(error));
  }

  return (
    <main className="pageWrapper">
      <SidebarTrigger className="absolute block md:hidden top-4 left-4 cursor-pointer z-10" />

      <div className="w-full max-w-[600px] h-full shrink-[2]">
        <StoriesSlider />
        
        <section className="flex flex-col gap-6 w-full">
          {isLoading &&
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
            <div ref={paginationRef} className="w-full h-4 shrink-0 bg-yellow-300"/>
          )}
        </section>
      </div>

      <RightSidebar />
    </main>
  )
}

export default HomePage