import { useEffect, useRef, useState, type RefObject } from "react";
import { Loader2Icon } from "lucide-react";
import MessageItem from "./MessageItem";
import { socket } from "@/utils/socket";
import type { MessageType, UserType } from "@/types/global";

interface Props {
  chatId: string;
  messages: MessageType[];
  currentUser: UserType | null;
  recipient: UserType | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  paginationRef: RefObject<HTMLDivElement | null>;
  chatBottomRef: RefObject<HTMLDivElement | null>;
}

const ChatContent = (props: Props) => {
  const {
    chatId,
    currentUser,
    recipient,
    messages,
    hasNextPage,
    isFetchingNextPage,
    paginationRef,
    chatBottomRef,
  } = props;

  const wrapperRef = useRef<HTMLDivElement>(null);

  const [scrollFromBottom, setScrollFromBottom] = useState(0);

  // Calcular la distancia scrolleada desde el fondo de la bandeja de mensajes
  useEffect(() => {
    const scrollHandler = (_e: Event) => {
      if (!wrapperRef.current) return;

      // Height total de la bandeja de mensajes incluyendo el scroll
      const scrollHeight = wrapperRef.current.scrollHeight;

      // Distancia scrolleada desde el fondo de la bandeja
      const scrollDistance = scrollHeight - (wrapperRef.current.scrollTop + wrapperRef.current!.clientHeight);

      setScrollFromBottom(scrollDistance);
    }

    if (wrapperRef.current) {
      wrapperRef.current.addEventListener("scroll", scrollHandler);
    }

    return () => {
      if (wrapperRef.current) {
        wrapperRef.current.removeEventListener("scroll", scrollHandler);
      }
    }
  }, [chatId]);

  // Scrollear al bottom al enviar/recibir un nuevo mensaje
  useEffect(() => {
    socket.on("newPrivateMessage", (newMessage) => {
      // Si el scroll es menor o igual a 300px, scrollear al bottom
      if (scrollFromBottom <= 300 && chatId === newMessage.message.chat) {
        wrapperRef.current!.scrollTop = wrapperRef.current!.scrollHeight;
      }
    });

    return () => {
      socket.off("newPrivateMessage");
    }
  }, [socket, chatId, scrollFromBottom]);

  if (!currentUser || !recipient) return null;

  return (
    <div
      ref={wrapperRef}
      className="w-full h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200"
    >
      {isFetchingNextPage &&
        <div className="flex justify-center items-center w-full py-2">
          <Loader2Icon className="size-5 text-neutral-600 animate-spin" />
        </div>
      }

      {hasNextPage &&
        <div ref={paginationRef} className="w-full h-6" />
      }

      <ul className="flex flex-col gap-6 w-full p-6">
        {messages.map((message) => (
          <MessageItem
            key={message._id}
            currentUserId={currentUser._id}
            messageData={message}
          />
        ))}
      </ul>

      <div ref={chatBottomRef} className="w-full h-1" />
    </div>
  )
}

export default ChatContent