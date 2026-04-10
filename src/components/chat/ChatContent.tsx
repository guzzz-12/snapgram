import { useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { AxiosError } from "axios";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import GroupInboxHeader from "./GroupInboxHeader";
import MessageItem from "./MessageItem";
import UserLeftOrKickedOrAddedMessageItem from "./UserLeftOrKickedOrAddedMessageItem";
import { useGetChatsMessages } from "@/services/chats";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import useIntersectionObserver from "@/hooks/useIntersectionObserver";
import useInboxHooks from "@/hooks/useInboxHooks";
import { errorMessage } from "@/utils/errorMessage";
import type { ChatType } from "@/types/global";

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

  const {user: currentUser} = useCurrentUser();

  const {
    messages,
    isLoadingMessages,
    isFetchingNextPage,
    hasNextPage,
    error,
    fetchNextPage
  } = useGetChatsMessages({chatId: chatData?._id, isLoadingChatData});

  // Observar si la referencia de la paginación es visible en el viewport
  const {isIntersecting} = useIntersectionObserver({
    data: messages,
    paginationRef,
    threshold: 0.1
  });

  // Inicializar los hooks de la bandeja de mensajes
  useInboxHooks({
    wrapperRef,
    isIntersecting,
    isLoadingMessages,
    chatData,
    params,
    fetchNextPage
  });

  if (error) {
    if (error instanceof AxiosError && error.response?.status === 404) {
      navigate("/messages", {replace: true});
    }

    toast.error(errorMessage(error));
  }

  return (
    <div
      ref={wrapperRef}
      className="w-full h-full overflow-x-hidden overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200"
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
        <ul className="flex flex-col gap-4.5 w-full px-4 py-6">
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
                currentUser={currentUser}
                messageData={message}
                chatData={chatData}
                chatType={chatData?.type}
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