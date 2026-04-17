import { useEffect, useRef, useState, type UIEvent } from "react";
import { useAuth } from "@clerk/clerk-react";
import { CircleArrowLeft, CircleArrowRight } from "lucide-react";
import { toast } from "sonner";
import StoryCardRounded from "./StoryCardRounded";
import StoryCardSkeletonRounded from "./StoryCardSkeletonRounded";
import { useGetUsersHavingStories } from "@/services/stories";
import useIntersectionObserver from "@/hooks/useIntersectionObserver";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { errorMessage } from "@/utils/errorMessage";
import { cn } from "@/lib/utils";

const StoriesSlider = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const paginationRef = useRef<HTMLDivElement>(null);

  const [showLeftArrow, setShowLeftArrow] = useState(true);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const { userId } = useAuth();

  const { user: currentUser } = useCurrentUser();

  const {
    data: usersWithStories,
    loading,
    error,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage
  } = useGetUsersHavingStories();

  // Verificar si la referencia del paginador está en el viewport
  const { isIntersecting } = useIntersectionObserver({ data: usersWithStories, paginationRef });

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

  // Colocar los stories del usuario actual al principio del slider
  const myStories = usersWithStories.find((user) => user.clerkId === userId);
  const otherStories = usersWithStories.filter((user) => user.clerkId !== userId);
  const sortedStories = [myStories, ...otherStories];

  if (error) {
    toast.error(errorMessage(error));
  }

  if ((!loading && usersWithStories.length === 0) || !currentUser) {
    return null;
  }

  return (
    <div className="relative max-w-full mb-4 min-xl:mr-4 overflow-x-hidden">
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
        className="w-full px-4 rounded-lg overflow-x-auto scrollbar-none"
        onScroll={onScrollHandler}
      >
        <div className="flex items-center gap-3">
          {loading && usersWithStories.length === 0 && Array.from({ length: 10 }).map((_, i) => (
            <StoryCardSkeletonRounded key={i} />
          ))}

          {sortedStories.map((data) => {
            if (!data) return null;

            return (
              <StoryCardRounded
                key={data._id}
                userData={data}
              />
            )
          })}

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