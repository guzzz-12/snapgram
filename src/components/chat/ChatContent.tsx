import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import GroupInboxHeader from "./GroupInboxHeader";
import MessageItem from "./MessageItem";
import UserLeftOrKickedOrAddedMessageItem from "./UserLeftOrKickedOrAddedMessageItem";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import useIntersectionObserver from "@/hooks/useIntersectionObserver";
import { socket } from "@/utils/socket";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import type { ChatType, MessageType } from "@/types/global";

interface Props {
  chatData: ChatType | null | undefined;
  isLoadingChatData: boolean;
}

const ChatContent = ({ chatData, isLoadingChatData }: Props) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const paginationRef = useRef<HTMLDivElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const params = useParams();

  const [scrollFromBottom, setScrollFromBottom] = useState(0);

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
      url: `/messages/chat/${chatData?._id}`,
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: {
        page,
        limit: 10
      }
    });

    return data;
  };

  // Consultar los mensajes del chat
  const {data: messagesData, isLoading: isLoadingMessages, isFetchingNextPage, hasNextPage, fetchNextPage, error} = useInfiniteQuery({
    queryKey: ["messages", chatData?._id],
    queryFn: ({pageParam}) => getMessages(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
    enabled: !isLoadingChatData && !!chatData && !chatData._id.startsWith("temp_"),
    retry: 2,
    refetchOnWindowFocus: false,
  });

  // Observar si la referencia de la paginación es visible en el viewport
  const {isIntersecting} = useIntersectionObserver({
    data: messagesData,
    paginationRef,
    threshold: 0.1
  });

  // Cargar la siguiente página de mensajes al llegar al top del chat
  useEffect(() => {
    if (isIntersecting && !isLoadingMessages) {
      wrapperRef.current!.scrollTop = 50;
      fetchNextPage()
    }
  }, [isIntersecting, isLoadingMessages]);

  // Scrollear al bottom de la bandeja de mensajes al entrar al chat
  useEffect(() => {
    if (wrapperRef.current && !isLoadingMessages && chatData) {
      wrapperRef.current.scrollTop = wrapperRef.current.scrollHeight;
    }
  }, [chatData, isLoadingMessages, params.chatId]);

  // Calcular la distancia scrolleada desde el fondo de la bandeja de mensajes
  useEffect(() => {
    const scrollHandler = (_e: Event) => {
      if (wrapperRef.current) {
        // Height total de la bandeja de mensajes incluyendo el scroll
        const scrollHeight = wrapperRef.current.scrollHeight;
  
        // Distancia scrolleada desde el fondo de la bandeja
        const scrollDistance = scrollHeight - (wrapperRef.current.scrollTop + wrapperRef.current!.clientHeight);
  
        setScrollFromBottom(scrollDistance);
      }
    }

    if (wrapperRef.current) {
      wrapperRef.current.addEventListener("scroll", scrollHandler);
    }

    return () => {
      if (wrapperRef.current) {
        wrapperRef.current.removeEventListener("scroll", scrollHandler);
      }
    }
  }, [chatData]);

  // Scrollear al bottom al enviar/recibir un nuevo mensaje
  useEffect(() => {
    socket.on("newMessage", (newMessage) => {
      // Si el scroll es menor o igual a 300px, scrollear al bottom
      if (scrollFromBottom <= 300 && chatData?._id === newMessage.message.chat) {
        wrapperRef.current!.scrollTop = wrapperRef.current!.scrollHeight;
      }
    });
  }, [socket, chatData, scrollFromBottom]);

  if (error) {
    if (error instanceof AxiosError && error.response?.status === 404) {
      navigate("/messages", {replace: true});
    }

    toast.error(errorMessage(error));
  }

  // Invertir el orden de los mensajes
  // para corregir la dirección de la paginación
  const messages = messagesData?.pages.flatMap((page) => page.data.messages).reverse() || [];

  return (
    <div
      ref={wrapperRef}
      className="w-full h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200"
    >
      {chatData && chatData.type === "group" && 
        <GroupInboxHeader groupData={chatData} />
      }

      {isFetchingNextPage &&
        <div className="flex justify-center items-center w-full py-2">
          <Loader2Icon className="size-5 text-neutral-600 animate-spin" />
        </div>
      }

      {hasNextPage && !isFetchingNextPage &&
        <div ref={paginationRef} className="w-full h-6" />
      }

      {!isLoadingChatData && currentUser &&
        <ul className="flex flex-col gap-6 w-full p-6">
          {messages.map((message) => {
            if (["userLeftGroup", "userKickedFromGroup", "userAddedToGroup"].includes(message.type)) {
              return (
                <UserLeftOrKickedOrAddedMessageItem
                  key={message._id}
                  messageData={message}
                />
              )
            }

            return (
              <MessageItem
                key={message._id}
                currentUserId={currentUser._id}
                messageData={message}
              />
            )
          })}
        </ul>
      }

      <div ref={chatBottomRef} className="w-full h-1" />
    </div>
  )
}

export default ChatContent