import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ImUsers } from "react-icons/im";
import { FaUsers } from "react-icons/fa6";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";
import ChatListItemSkeleton from "./ChatListItemSkeleton";
import ChatItem from "./ChatItem";
// import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import useIntersectionObserver from "@/hooks/useIntersectionObserver";
import { useUsersTyping } from "@/hooks/useUsersTyping";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import type { ChatType } from "@/types/global";

interface Props {
  headerHeight: number;
  temporaryChatItem: ChatType | null;
  chatTypeParam?: "all" | "group" | null;
}

const ChatList = ({ headerHeight, temporaryChatItem, chatTypeParam }: Props) => {
  const paginationRef = useRef<HTMLDivElement>(null);

  const {chatId} = useParams<{chatId: string}>();

  const navigate = useNavigate();

  const {getToken} = useAuth();

  const {user} = useCurrentUser();

  const {usersTyping} = useUsersTyping();

  useEffect(() => {
    if (!chatId) {
      if (chatTypeParam && ["all", "group"].includes(chatTypeParam)) {
        navigate(`/messages?type=${chatTypeParam}`);
      } else {
        navigate(`/messages?type=all`);
      }
    }
  }, [chatTypeParam, chatId]);

  // Función para consultar los chats (tanto privados como grupales)
  const getChats = async (page: number, type: "all" | "group") => {
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
        limit: 10,
        type
      }
    });

    return data;
  }

  // Consultar los chats
  const {data, error, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} = useInfiniteQuery({
    queryKey: ["chats", chatTypeParam || "all"],
    queryFn: ({pageParam}) => getChats(pageParam, chatTypeParam || "all"),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
    refetchOnWindowFocus: false,
    enabled: !!chatTypeParam || !!chatId
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
    <aside className="flex flex-col w-[320px] h-full pb-6 border-r overflow-hidden">
      <div
        style={{ height: `calc(${headerHeight}px + 1px)` }}
        className="flex flex-col justify-center items-start w-full bg-white border-b"
      >
        <Tabs
          className="w-full h-full rounded-sm"
          value={chatTypeParam || "all"}
          defaultValue="all"
          onValueChange={(value) => {
            navigate(`/messages?type=${value}`);
          }}
        >
          <TabsList className="w-full h-full gap-2 p-0 bg-white rounded-md">
            <TabsTrigger
              className="w-full h-full !text-[16px] !text-center font-normal bg-white rounded-t-xs rounded-b-none border-t-0 border-l-0 border-r-0 border-b-3 border-transparent cursor-pointer transition-all data-[state=active]:text-[#4F39F6] data-[state=active]:font-semibold data-[state=active]:border-[#4F39F6] data-[state=active]:shadow-none data-[state=active]:bg-[#4F39F6]/10"
              value="all"
            >
              Chats
            </TabsTrigger>

            <TabsTrigger
              className="w-full h-full !text-[16px] !text-center font-normal bg-white rounded-t-xs rounded-b-none border-t-0 border-l-0 border-r-0 border-b-3 border-transparent cursor-pointer transition-all data-[state=active]:text-[#4F39F6] data-[state=active]:font-semibold data-[state=active]:border-[#4F39F6] data-[state=active]:shadow-none data-[state=active]:bg-[#4F39F6]/10"
              value="group"
            >
              Tus Grupos
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* <search>
          <Input
            className="hidden min-[900px]:block w-full p-2 bg-slate-100 rounded-md"
            type="search"
            placeholder="Buscar..."
          />
        </search> */}
      </div>

      <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
        {isLoading &&
          <div className="flex flex-col gap-2 w-full px-4 pt-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <ChatListItemSkeleton key={index} />
            ))}
          </div>
        }

        {/* Chat temporal (se muestra al seleccionar un usuario por primera vez) */}
        {!isLoading && temporaryChatItem && (chatTypeParam === "all" || chatId) &&
          <ChatItem chatData={temporaryChatItem} usersTyping={[]}/>
        }

        {chats.map((chat) => {
          return (
            <ChatItem
              key={chat._id}
              chatData={chat}
              usersTyping={usersTyping}
            />
          )
        })}

        {/* Mostrar mensaje placeholder en la lista de chats/grupos si no hay chats */}
        {chats.length === 0 && !isLoading &&
          <div className="flex flex-col justify-center items-center w-full px-4 py-5">
            {!temporaryChatItem && chatTypeParam === "all" &&
              <>
                <ImUsers className="size-16 text-neutral-500" />
            
                <p className="mb-2 text-base text-center text-neutral-500 font-semibold leading-tight">
                  Aún no tienes conversaciones
                </p>
              </>
            }

            {chatTypeParam === "group" &&
              <>
                <FaUsers className="size-16 text-neutral-500" />

                <p className="mb-2 text-base text-center text-neutral-500 font-semibold leading-tight">
                  Aún no has creado grupos
                </p>
              </>
            }
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