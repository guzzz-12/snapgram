import { useRef, useState, type UIEvent } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { CircleArrowLeft, CircleArrowRight } from "lucide-react";
import { toast } from "sonner";
import StoryCardRounded from "./StoryCardRounded";
import StoryCardSkeletonRounded from "./StoryCardSkeletonRounded";
import StoryViewer from "./StoryViewer";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import type { StoryType } from "@/types/global";
import { cn } from "@/lib/utils";

const StoriesSlider = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const [openStoryId, setOpenStoryId] = useState<string | null>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(true);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const { getToken } = useAuth();

  const getStories = async (page: number) => {
    const token = await getToken();

    const {data} = await axiosInstance<{
      data: StoryType[];
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

  const {data, error, isFetching: loading, isFetchingNextPage, hasNextPage, fetchNextPage} = useInfiniteQuery({
    queryKey: ["stories"],
    queryFn: ({pageParam}) => getStories(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
    refetchOnWindowFocus: false
  });
  
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
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < (e.currentTarget.scrollWidth - e.currentTarget.clientWidth));
  }

  const stories = data?.pages.flatMap((page) => page.data) || [];

  if (error) {
    toast.error(errorMessage(error));
  }

  return (
    <div className="relative w-full mb-5 overflow-x-hidden">
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
        <StoryViewer
          isOpen={!!openStoryId}
          storyId={openStoryId}
          setOpenStoryId={(id) => setOpenStoryId(id)}
        />

        <div className="flex items-center gap-3">
          {loading && stories.length === 0 && Array.from({ length: 5 }).map((_, i) => (
            <StoryCardSkeletonRounded key={i} />
          ))}
          {!loading && stories.map((story) => (
            <StoryCardRounded
              key={story._id}
              storyData={story}
              setOpenStoryId={(storyId) => setOpenStoryId(storyId)}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

export default StoriesSlider