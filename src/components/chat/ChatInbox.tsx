import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";
import ChatHeader from "./ChatHeader";
import ChatContent from "./ChatContent";
import ChatInput from "./ChatInput";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import type { ChatType } from "@/types/global";

interface Props {
  chatId: string;
  temporaryChat: ChatType | null;
  headerHeight: number;
  setHeaderHeight: Dispatch<SetStateAction<number>>;
  setTemporaryChat: Dispatch<SetStateAction<ChatType | null>>;
}

const ChatInbox = (props: Props) => {
  const {chatId, temporaryChat, headerHeight, setHeaderHeight, setTemporaryChat} = props;

  const headerRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const chatTypeParam = searchParams.get("type") as "all" | "group" | null;

  const {getToken} = useAuth();

  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.clientHeight);
    }
  }, []);

  const getChat = async (chatId: string) => {
    const token = await getToken();

    const {data} = await axiosInstance<{data: ChatType}>({
      method: "GET",
      url: `/chats/${chatId}`,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return data.data;
  };

  // Query para consultar la data del chat
  const {data: chat, isLoading, error: chatError} = useQuery({
    queryKey: ["chat", chatId],
    queryFn: () => getChat(chatId),
    enabled: !!chatId,
    refetchOnWindowFocus: false
  });

  if (chatError) {
    if (chatError instanceof AxiosError && chatError.response?.status === 404) {
      navigate("/messages?type=all", {replace: true});
    }

    toast.error(errorMessage(chatError));
  }

  return (
    <div className="flex flex-col w-full h-full">
      <ChatHeader
        chatData={temporaryChat || chat}
        isLoading={isLoading}
        headerHeight={headerHeight}
        headerRef={headerRef}
      />

      <ChatContent chatData={temporaryChat || chat} />

      <ChatInput
        chatData={temporaryChat || chat}
        wrapperHeight={headerHeight}
        setTemporaryChat={setTemporaryChat}
        chatTypeParam={chatTypeParam}
      />
    </div>
  )
}

export default ChatInbox