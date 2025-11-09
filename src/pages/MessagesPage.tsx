import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { AxiosError } from "axios";
import { LuSendHorizontal  } from "react-icons/lu";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";
import ChatHeader from "@/components/chat/ChatHeader";
import ChatContent from "@/components/chat/ChatContent";
import ChatInput from "@/components/chat/ChatInput";
import ChatList from "@/components/chat/ChatList";
import UsersModalList from "@/components/chat/UsersModalList";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import useIntersectionObserver from "@/hooks/useIntersectionObserver";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import type { ChatType, MessageType } from "@/types/global";

const MessagesPage = () => {
  const headerRef = useRef<HTMLDivElement>(null);
  const paginationRef = useRef<HTMLDivElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const {chatId} = useParams<{chatId: string}>();

  const navigate = useNavigate();

  const [headerHeight, setHeaderHeight] = useState(67);
  const [temporaryChat, setTemporaryChat] = useState<ChatType | null>(null);

  const {user: currentUser} = useCurrentUser();

  const {getToken} = useAuth();

  // Función para consultar los mensajes
  const getMessages = async (page: number) => {
    const token = await getToken();

    const {data} = await axiosInstance<{
      data: {
        messages: MessageType[];
        chat: ChatType;
      }
      hasMore: boolean;
      nextPage: number | null;
    }>({
      method: "GET",
      url: `/messages/chat/${chatId}`,
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: {
        page,
        limit: 5
      }
    });

    return data;
  };

  // Ocultar/mostrar el scrollbar del body
  useEffect(() => {
    document.body.style.overflow = "hidden";
    
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  // Consultar los mensajes del chat
  const {data: messagesData, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error} = useInfiniteQuery({
    queryKey: ["messages", chatId],
    queryFn: ({pageParam}) => getMessages(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
    enabled: Boolean(chatId && !chatId.startsWith("temp_")),
    retry: 2,
    refetchOnWindowFocus: false
  });

  // Obtener el height del header
  // Scrollear al bottom del chat cuando se cambia el chat
  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.clientHeight);
    }

    if (chatBottomRef.current && !isLoading) {
      chatBottomRef.current.scrollIntoView({block: "end"});
    }
  }, [chatId, isLoading]);

  // Observar si la referencia de la paginación es visible en el viewport
  const {isIntersecting} = useIntersectionObserver({
    data: messagesData,
    paginationRef
  });

  // Cargar la siguiente página de mensajes al llegar al top del chat
  useEffect(() => {
    if (isIntersecting && !isLoading) {
      fetchNextPage();
    }
  }, [isIntersecting, isLoading]);

  if (error) {
    if (error instanceof AxiosError && error.response?.status === 404) {
      navigate("/messages", {replace: true});
    }

    toast.error(errorMessage(error));
  }
  
  // Invertir el orden de los mensajes
  // para corregir la dirección de la paginación
  const messages = messagesData?.pages.flatMap((page) => page.data.messages).reverse() || [];

  const chat = messagesData?.pages[0]?.data.chat || null;

  // Obtener el destinatario del chat
  const recipient = temporaryChat ? temporaryChat.participants.find((user) => user._id !== currentUser?._id) : chat?.participants.find((user) => user._id !== currentUser?._id);

  const recipientId = recipient?._id || "";

  return (
    <main className="flex w-full h-[100vh] bg-white overflow-hidden">
      <SidebarTrigger className="absolute block md:hidden top-4 left-4 cursor-pointer z-10" />
      
      <ChatList
        headerHeight={headerHeight}
        temporaryChatItem={temporaryChat}
      />

      <section className="flex flex-col justify-start w-full overflow-hidden">
        {isLoading &&
          <>
            <div
              style={{height: `${headerHeight}px`}}
              className="flex justify-start gap-3 w-full px-6 py-2 bg-white border-b"
            >
              <Skeleton className="w-[50px] h-[50px] shrink-0 rounded-full bg-neutral-200" />

              <div className="flex flex-col justify-center items-start gap-2 w-full">
                <Skeleton className="w-[60%] h-4 rounded bg-neutral-200" />
                <Skeleton className="w-1/4 h-3 rounded bg-neutral-200" />
              </div>
            </div>

            <div className="flex justify-center items-center w-full h-full">
              <Loader2Icon className="size-8 text-neutral-600 animate-spin" />
            </div>
          </>
        }

        {chatId && recipient && !isLoading &&
          <>
            <ChatHeader recipient={recipient} headerRef={headerRef} />

            <ChatContent
              chatId={chatId}
              currentUser={currentUser}
              recipient={recipient}
              messages={messages}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              paginationRef={paginationRef}
              chatBottomRef={chatBottomRef}
            />

            <ChatInput
              wrapperHeight={headerHeight}
              recipientId={recipientId}
              setTemporaryChat={setTemporaryChat}
              chatId={chatId}
            />
          </>
        }

        {!chatId &&
          <div className="flex flex-col justify-center items-center w-full h-full">
            <div className="flex justify-center items-center w-[120px] h-[120px] mb-2 shrink-0 rounded-full border-2 border-neutral-600">
              <LuSendHorizontal className="size-16 text-neutral-600 stroke-1" />
            </div>

            <h1 className="text-xl">
              Enviar mensaje
            </h1>

            <p className="mb-5 text-center text-sm text-neutral-600">
              Envia mensajes a tus amigos o grupos
            </p>

            <UsersModalList setTemporaryChat={setTemporaryChat} />
          </div>
        }
      </section>
    </main>
  )
}

export default MessagesPage