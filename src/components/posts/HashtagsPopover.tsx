import { createPortal } from "react-dom";
import { useEffect, useRef, type RefObject } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Command, CommandItem, CommandList } from "@/components/ui/command";
import useIntersectionObserver from "@/hooks/useIntersectionObserver";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import type { HashtagWithPostsCount } from "@/types/global";

interface Props {
  openPopover: boolean;
  position: { // La posición del cursor en el textarea con respecto al wrapper
    left: number;
    top: number;
  };
  currentlyTypingHashtag: string; // El hashtag que se esta escribiendo
  selectedHashtag: string; // El hashtag que se seleccionó de la lista
  hashtagsListRef: RefObject<HTMLDivElement | null>;
  setSelectedHashtag: (hashtag: string) => void;
  setOpenPopover: (openPopover: boolean) => void;
}

const HashtagsPopover = (props: Props) => {
  const {openPopover, position, currentlyTypingHashtag, selectedHashtag, hashtagsListRef, setSelectedHashtag, setOpenPopover} = props;

  const paginationRef = useRef<HTMLDivElement>(null);

  const {getToken} = useAuth();

  const queryClient = useQueryClient();

  // Consultar los hashtags
  const {data, isLoading, error: hashtagsError, isEnabled, isRefetching, isFetchingNextPage, hasNextPage, fetchNextPage, refetch} = useInfiniteQuery({
    queryKey: ["hashtags", currentlyTypingHashtag],
    queryFn: async ({pageParam = 1}) => {
      const token = await getToken();

      const {data} = await axiosInstance<{
        data: HashtagWithPostsCount[];
        hasMore: boolean;
        nextPage: number | null;
      }>({
        method: "GET",
        url: "/hashtags",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        params: {
          title: currentlyTypingHashtag,
          page: pageParam,
          limit: 10
        }
      });

      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
    refetchOnWindowFocus: false,
    enabled: openPopover && !!currentlyTypingHashtag,
    retry: 2
  });

  // Crear el hashtag
  const {mutate: createHashtag, isPending} = useMutation({
    mutationFn: async () => {
      const token = await getToken();

      return axiosInstance( {
        method: "POST",
        url: "/hashtags",
        data: {
          title: selectedHashtag || currentlyTypingHashtag
        },
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        }
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ["hashtags"]});
      setOpenPopover(false);
    },
    onError: (err) => {
      toast.error(errorMessage(err));
    },
    retry: 2
  });

  const {isIntersecting} = useIntersectionObserver({paginationRef, data});

  // Volver a consultar los hashtags si se esta escribiendo un hashtag
  useEffect(() => {
    if (currentlyTypingHashtag) {
      refetch();
    }
  }, [currentlyTypingHashtag]);

  // Consultar la siguiente página de hashtags
  useEffect(() => {
    if (hasNextPage && isIntersecting) {
      fetchNextPage();
    }
  }, [hasNextPage, isIntersecting]);

  // Invalidar el query del hashtag si se cierra el popover
  useEffect(() => {
    return () => {
      queryClient.invalidateQueries({queryKey: ["hashtags", currentlyTypingHashtag]});
    }
  }, [openPopover, currentlyTypingHashtag]);

  if (hashtagsError) {
    toast.error(errorMessage(hashtagsError));
  }

  const hashtags = data?.pages.flatMap((page) => page.data) || [];
  const loading = isLoading || isPending || isRefetching;

  if (!openPopover) return null;

  return (
    createPortal(
      <Command
        ref={hashtagsListRef}
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          transform: "translate(-30%, 1.5rem)",
        }}
        className="fixed w-[320px] h-fit max-h-[320px] rounded-md bg-slate-100 border shadow-md pointer-events-auto z-[50]"
        shouldFilter={false}
      >
        <CommandList className="p-1 bg-white">
          {(loading || (!loading && !isEnabled && openPopover)) &&
            <CommandItem
              className="flex justify-center items-center px-2 py-3 text-sm capitalize cursor-pointer data-[selected=true]:!bg-[#331fcf]/10"
              disabled={true}
            >
              <Loader2Icon className="size-6 animate-spin" aria-hidden />
              <span className="sr-only">Cargando hashtags</span>
            </CommandItem>
          }

          {!loading && hashtags.length > 0 && hashtags.map((hashtag) => (
            <CommandItem
              key={hashtag._id}
              className="px-2 py-3 text-sm cursor-pointer data-[selected=true]:!bg-[#331fcf]/10"
              disabled={loading}
              onSelect={setSelectedHashtag}
            >
              {hashtag.title}
            </CommandItem>
          ))}

          {isFetchingNextPage &&
            <CommandItem
              className="flex justify-center items-center p-2 text-sm capitalize cursor-pointer data-[selected=true]:!bg-[#331fcf]/10"
              disabled={true}
            >
              <Loader2Icon className="size-6 animate-spin" aria-hidden />
              <span className="sr-only">Cargando hashtags</span>
            </CommandItem>
          }

          {!loading && isEnabled && !hashtags.length && (
            <CommandItem
              className="block px-2 py-3 text-sm truncate cursor-pointer data-[selected=true]:!bg-[#331fcf]/10"
              disabled={loading}
              onSelect={() => createHashtag()}
            >
              Crear hashtag <span className="font-semibold">{currentlyTypingHashtag}</span>
            </CommandItem>
          )}

          {hasNextPage && (
            <div ref={paginationRef} className="w-full h-6"/>
          )}
        </CommandList>
      </Command>,
      document.body
    )
  )
}

export default HashtagsPopover