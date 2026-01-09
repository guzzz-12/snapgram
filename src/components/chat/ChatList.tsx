import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { ImUsers } from "react-icons/im";
import { FaUsers } from "react-icons/fa6";
import { HiOutlinePencilAlt } from "react-icons/hi";
import { toast } from "sonner";
import ChatListItemSkeleton from "./ChatListItemSkeleton";
import ChatItem from "./ChatItem";
import MobileNavSidebar from "@/components/MobileNavSidebar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import useIntersectionObserver from "@/hooks/useIntersectionObserver";
import { useUsersTyping } from "@/hooks/useUsersTyping";
import { usePrivateChatsListModal } from "@/hooks/usePrivateChatsListModal";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import type { ChatType } from "@/types/global";

interface Props {
  headerHeight: number;
  temporaryChatItem: ChatType | null;
  chatTypeParam?: "all" | "group" | null;
  loadedCryptoKeys: boolean;
}

const ChatList = ({ temporaryChatItem, chatTypeParam, headerHeight, loadedCryptoKeys }: Props) => {
  const paginationRef = useRef<HTMLDivElement>(null);

  const {chatId} = useParams<{chatId: string}>();

  const navigate = useNavigate();

  const {setIsOpen: setOpenPrivateChatsModal} = usePrivateChatsListModal();

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
    enabled: !!loadedCryptoKeys && (!!chatTypeParam || !!chatId)
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
    <aside className="flex flex-col w-fit min-[950px]:w-[240px] shrink-0 h-full pb-4 min-[600px]:pb-6 border-r overflow-hidden">
      {loadedCryptoKeys &&
        <Button
          style={{height: `${headerHeight}px`}}
          className="p-2 min-[700px]:py-4 rounded-none cursor-pointer"
          variant="ghost"
          onClick={() => setOpenPrivateChatsModal(true)}
        >
          <HiOutlinePencilAlt className="size-7 shrink-0 text-neutral-700" aria-hidden />
          <span className="hidden min-[950px]:block text-base text-neutral-900 font-normal">
            Nuevo mensaje
          </span>
        </Button>
      }

      <div
        // style={{ height: `calc(${headerHeight}px + 1px)` }}
        className="flex flex-col justify-center items-start w-full bg-white border-y"
      >
        <Tabs
          className="w-full h-full rounded-sm"
          value={chatTypeParam || "all"}
          defaultValue="all"
          onValueChange={(value) => {
            navigate(`/messages?type=${value}`);
          }}
        >
          <TabsList className="flex-col min-[950px]:flex-row w-full h-fit gap-0 p-0 bg-white rounded-md">
            <TabsTrigger
              className="w-full h-full px-2 py-3 min-[700px]:p-4 shrink-0 !text-[16px] !text-center font-normal bg-white rounded-t-xs rounded-b-none border-t-0 border-l-0 border-r-0 border-b-3 border-transparent cursor-pointer transition-all data-[state=active]:text-[#4F39F6] data-[state=active]:font-semibold data-[state=active]:border-none data-[state=active]:shadow-none data-[state=active]:bg-[#4F39F6]/10"
              value="all"
            >
              Chats
            </TabsTrigger>

            <TabsTrigger
              className="w-full h-full px-2 py-3 min-[700px]:p-4 shrink-0 !text-[16px] !text-center font-normal bg-white rounded-t-xs rounded-b-none border-t-0 border-l-0 border-r-0 border-b-3 border-transparent cursor-pointer transition-all data-[state=active]:text-[#4F39F6] data-[state=active]:font-semibold data-[state=active]:border-none data-[state=active]:shadow-none data-[state=active]:bg-[#4F39F6]/10"
              value="group"
            >
              Grupos
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

      <MobileNavSidebar />
    </aside>
  )
}

export default ChatList