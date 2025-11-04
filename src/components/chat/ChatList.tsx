import { useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { MdGroups } from "react-icons/md";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";
import ChatListItemSkeleton from "./ChatListItemSkeleton";
import ChatItem from "./ChatItem";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import useIntersectionObserver from "@/hooks/useIntersectionObserver";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import type { ChatType } from "@/types/global";

interface Props {
  headerHeight: number;
  temporaryChatItem: ChatType | null;
}

const ChatList = ({ headerHeight, temporaryChatItem }: Props) => {
  const paginationRef = useRef<HTMLDivElement>(null);

  const {getToken} = useAuth();

  const {user} = useCurrentUser();

  // Función para consultar los chats
  const getChats = async (page: number) => {
    const token = await getToken();

    const {data} = await axiosInstance<{
      data: ChatType[];
      hasMore: boolean;
      nextPage: number | null;
    }>({
      method: "GET",
      url: "/chats",
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: {
        page,
        limit: 10
      }
    });

    return data;
  }

  // Consultar los chats
  const {data, error, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} = useInfiniteQuery({
    queryKey: ["chats"],
    queryFn: ({pageParam}) => getChats(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
    refetchOnMount: false
  });

  const {isIntersecting} = useIntersectionObserver({data, paginationRef});

  useEffect(() => {
    if (isIntersecting && hasNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting]);

  const chats = data?.pages.flatMap((page) => page.data) || [];

  if (error) {
    toast.error(errorMessage(error));
  }

  if (!user) {
    return null;
  }

  return (
    <aside className="flex flex-col w-fit min-[900px]:w-[320px] h-full pb-6 border-r overflow-hidden">
      <div
        style={{ height: `calc(${headerHeight}px + 1px)` }}
        className="flex flex-col justify-center items-start w-full p-4 bg-white border-b"
      >
        <search>
          <Input
            className="hidden min-[900px]:block w-full p-2 bg-slate-100 rounded-md"
            type="search"
            placeholder="Buscar..."
          />
        </search>
      </div>

      <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
        {isLoading &&
          <div className="flex flex-col gap-2 w-full px-4 pt-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <ChatListItemSkeleton key={index} />
            ))}
          </div>
        }

        {!isLoading && temporaryChatItem && 
          <ChatItem chatData={temporaryChatItem}/>
        }

        {chats.map((chat) => <ChatItem key={chat._id} chatData={chat} />)}

        {chats.length === 0 && !temporaryChatItem && !isLoading &&
          <div className="flex flex-col justify-center items-center w-full px-4 py-5">
            <MdGroups className="w-[80px] h-[80px] text-neutral-500" />
        
            <p className="mb-2 text-base text-center text-neutral-500 font-semibold leading-tight">
              Aún no tienes conversaciones.
            </p>

            <span className="text-sm text-neutral-500 text-center leading-tight">
              Pulsa en "Enviar Mensaje" para empezar tu primera conversación.
            </span>
          </div>
        }

        {isFetchingNextPage &&
          <div className="flex flex-col gap-2 w-full px-4 pt-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <ChatListItemSkeleton key={index} />
            ))}
          </div>
        }

        {hasNextPage &&
          <div ref={paginationRef} className="w-full h-4 bg-yellow-300" />
        }
      </div>
    </aside>
  )
}

export default ChatList