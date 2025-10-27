import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import LikeItem from "./LikeItem";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Skeleton } from "../ui/skeleton";
import useIntersectionObserver from "@/hooks/useIntersectionObserver";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import { cn } from "@/lib/utils";
import type { LikeType, PostWithLikes } from "@/types/global";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

interface Props {
  postData: PostWithLikes;
  itemId: string;
  itemType: "post" | "comment";
}

const LikesPopover = (props: Props) => {
  const { postData, itemId, itemType } = props;

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
      <Tooltip>
        <PopoverTrigger asChild>
          <TooltipTrigger asChild>
            <button
              className={cn("flex justify-start items-center gap-1 text-sm font-semibold cursor-pointer hover:underline", postData.likesCount === 0 && "pointer-events-none")}
              disabled={postData.likesCount === 0}
              onClick={(e) => {
                if (postData.likesCount === 0) {
                  e.preventDefault()
                }
              }}
            >
              <Heart
                className="size-5.5 text-neutral-500"
                aria-hidden
              />
              <span className="text-neutral-700">
                {postData.likesCount}
              </span>
            </button>
          </TooltipTrigger>
        </PopoverTrigger>
        
        <TooltipContent sideOffset={5}>
          {postData.likesCount} me gusta
        </TooltipContent>
      </Tooltip>

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