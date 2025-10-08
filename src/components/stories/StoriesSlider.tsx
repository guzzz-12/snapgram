import { useEffect, useRef, useState, type UIEvent } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { CircleArrowLeft, CircleArrowRight } from "lucide-react";
import { toast } from "sonner";
import StoryCardRounded from "./StoryCardRounded";
import StoryCardSkeletonRounded from "./StoryCardSkeletonRounded";
import UserStoriesViewer from "./UserStoriesViewer";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import type { UserWithStories } from "@/types/global";
import { cn } from "@/lib/utils";

const StoriesSlider = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const paginationRef = useRef<HTMLDivElement>(null);

  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(true);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [isIntersecting, setIsIntersecting] = useState(false);

  const { getToken } = useAuth();

  const getStories = async (page: number) => {
    const token = await getToken();

    const {data} = await axiosInstance<{
      data: UserWithStories[];
      hasMore: boolean;
      nextPage: number | null;
    }>({
      method: "GET",
      url: "/stories",
      params: {
        page,
        limit: 10
      },
      headers: {
        Authorization: `Bearer ${token}`
      },
    });

    return data;
  };

  const {data, error, isLoading: loading, isFetchingNextPage, hasNextPage, fetchNextPage} = useInfiniteQuery({
    queryKey: ["stories"],
    queryFn: ({pageParam}) => getStories(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
    refetchOnWindowFocus: false
  });

  // Verificar si la referencia del paginador está en el viewport
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      setIsIntersecting(entries[0].isIntersecting)
    }, {
      threshold: 0.5
    });

    if (paginationRef.current) {
      observer.observe(paginationRef.current);
    }

    return () => {
      if (paginationRef.current) {
        observer.unobserve(paginationRef.current);
      }
    }
  }, [hasNextPage]);

  // Consultar la siguiente página de stories
  // si la referencia del paginador está en el viewport
  // y si hay más stories
  useEffect(() => {
    if (isIntersecting && hasNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage]);
  
  const SCROLL_STEP = 240;

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: -SCROLL_STEP,
        behavior: "smooth",
      });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: SCROLL_STEP,
        behavior: "smooth"
      });
    }
  };

  const onScrollHandler = (e: UIEvent<HTMLElement, globalThis.UIEvent>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const scrollWidth = e.currentTarget.scrollWidth;
    const clientWidth = e.currentTarget.clientWidth;
    
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < (scrollWidth - clientWidth));
  }

  const usersWithStories = data?.pages.flatMap((page) => page.data) || [];

  if (error) {
    toast.error(errorMessage(error));
  }

  if (usersWithStories.length === 0) {
    return null;
  }

  return (
    <div className="relative max-w-full mb-6 overflow-x-hidden">
      {/* Botones del slider */}
      <button
        className={cn("absolute top-0 left-0 flex justify-center items-center h-full px-2 opacity-50 hover:opacity-100 transition-opacity cursor-pointer z-10", showLeftArrow ? "flex" : "hidden")}
        onClick={scrollLeft}
      >
        <CircleArrowLeft 
          className="size-7 stroke-white fill-[#4F39F6]"
          aria-hidden
        />
        <span className="sr-only">
          Ir a las historias anteriores
        </span>
      </button>

      <button
        style={{ display: showRightArrow ? "flex" : "none" }}
        className={cn("absolute top-0 right-0 justify-center items-center h-full px-2 opacity-50 hover:opacity-100 transition-opacity cursor-pointer z-10", showRightArrow ? "flex" : "hidden")}
        onClick={scrollRight}
      >
        <CircleArrowRight
          className="size-7 stroke-white fill-[#4F39F6]"
          aria-hidden
        />
        <span className="sr-only">
          Ir a las historias siguientes
        </span>
      </button>

      <section
        ref={scrollRef}
        className="w-full overflow-x-auto scrollbar-none"
        onScroll={onScrollHandler}
      >
        <UserStoriesViewer
          isOpen={!!openUserId}
          usersWithStories={usersWithStories}
          storiesUserId={openUserId}
          setStoriesUserId={(id) => setOpenUserId(id)}
        />

        <div className="flex items-center gap-3">
          {loading && usersWithStories.length === 0 && Array.from({ length: 10 }).map((_, i) => (
            <StoryCardSkeletonRounded key={i} />
          ))}

          {usersWithStories.map((user) => (
            <StoryCardRounded
              key={user._id}
              userData={user}
              setOpenUserId={(userId) => setOpenUserId(userId)}
            />
          ))}

          {isFetchingNextPage && Array.from({ length: 10 }).map((_, i) => (
            <StoryCardSkeletonRounded key={i} />
          ))}

          {hasNextPage &&
            <div
              ref={paginationRef}
              className="w-[20px] h-[20px] shrink-0"
            />
          }
        </div>
      </section>
    </div>
  )
}

export default StoriesSlider