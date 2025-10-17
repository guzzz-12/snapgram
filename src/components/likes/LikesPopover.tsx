import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import LikeItem from "./LikeItem";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Skeleton } from "../ui/skeleton";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import { cn } from "@/lib/utils";
import type { LikeType } from "@/types/global";
import useIntersectionObserver from "@/hooks/useIntersectionObserver";

interface Props {
  likesCount: number;
  itemId: string;
  itemType: "post" | "comment";
}

const LikesPopover = (props: Props) => {
  const { likesCount, itemId, itemType } = props;

  const paginationRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);

  const {getToken} = useAuth();

  const {data, error, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} = useInfiniteQuery({
    queryKey: ["likes", "post", itemId],
    queryFn: async ({pageParam = 1}) => {
      const token = await getToken();

      const {data} = await axiosInstance<{
        data: LikeType[];
        hasMore: boolean;
        nextPage: number | null;
      }>({
        method: "GET",
        url: `/likes/post/${itemId}`,
        headers: {
          Authorization: `Bearer ${token}`
        },
        params: {
          limit: 5,
          page: pageParam
        }
      });

      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
    refetchOnWindowFocus: false,
    enabled: isOpen,
  });

  const {isIntersecting} = useIntersectionObserver({ data, paginationRef });

  useEffect(() => {
    if (isIntersecting && hasNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage]);

  if (error) {
    toast.error(errorMessage(error));
  }

  const likes = data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
      }}
    >
      <PopoverTrigger asChild>
        <button
          className={cn("cursor-pointer", likesCount === 0 && "pointer-events-none")}
          disabled={likesCount === 0}
          onClick={(e) => {
            if (likesCount === 0) {
              e.preventDefault()
            }
          }}
        >
          {likesCount} Me gusta
        </button>
      </PopoverTrigger>

      <PopoverContent className="p-0 overflow-hidden">
        <div className="w-full max-h-[320px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
          {isLoading &&
            <div className="flex flex-col gap-1 w-full p-3">
              <Skeleton className="w-full h-9 grow rounded-md bg-neutral-200" />
              <Skeleton className="w-full h-9 grow rounded-md bg-neutral-200" />
              <Skeleton className="w-full h-9 grow rounded-md bg-neutral-200" />
            </div>
          }

          {!isLoading && likes.length > 0 &&
            <ul className="flex flex-col gap-1 w-full p-2 bg-white">
              {likes.map ((like) => (
                <LikeItem key={like._id} like={like} />
              ))}
            </ul>
          }

          {!isLoading && likes.length === 0 &&
            <div className="flex flex-col gap-1 w-full p-3">
              <p className="text-neutral-500 text-sm font-semibold">
                Nadie ha dado me gusta aún
              </p>
            </div>
          }

          {isFetchingNextPage &&
            <div className="flex flex-col gap-1 w-full p-3">
              <Skeleton className="w-full h-9 grow rounded-md bg-neutral-200" />
              <Skeleton className="w-full h-9 grow rounded-md bg-neutral-200" />
              <Skeleton className="w-full h-9 grow rounded-md bg-neutral-200" />
              <Skeleton className="w-full h-9 grow rounded-md bg-neutral-200" />
              <Skeleton className="w-full h-9 grow rounded-md bg-neutral-200" />
            </div>
          }

          {hasNextPage && !isFetchingNextPage &&
            <div ref={paginationRef} className="w-full h-3" />
          }
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default LikesPopover