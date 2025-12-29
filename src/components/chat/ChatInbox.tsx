import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { IoWarningOutline } from "react-icons/io5";
import { AxiosError } from "axios";
import { toast } from "sonner";
import ChatHeader from "./ChatHeader";
import ChatContent from "./ChatContent";
import ChatInput from "./ChatInput";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import { socket } from "@/utils/socket";
import type { ChatType } from "@/types/global";

interface Props {
  chatId: string;
  temporaryChat: ChatType | null;
  headerHeight: number;
  setTemporaryChat: Dispatch<SetStateAction<ChatType | null>>;
}

const ChatInbox = (props: Props) => {
  const {chatId, temporaryChat, headerHeight, setTemporaryChat} = props;

  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const chatTypeParam = searchParams.get("type") as "all" | "group" | null;

  const [recipientPublicKey, setRecipientPublicKey] = useState<JsonWebKey | null>(null);

  const [isBlocked, setIsBlocked] = useState<{
    blockedBy: string | null;
    blockedUser: string | null;
  }>({
    blockedBy: null,
    blockedUser: null
  });

  const {getToken} = useAuth();

  // Query para consultar la data del chat
  const {data: chat, isFetching, error: chatError} = useQuery({
    queryKey: ["chat", chatId],
    queryFn: async () => {
      const token = await getToken();

      const {data} = await axiosInstance<{
        data: ChatType;
        isBlocked: {
          blockedBy: string | null;
          blockedUser: string | null;
        };
      }>({
        method: "GET",
        url: `/chats/${chatId}`,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setIsBlocked(data.isBlocked);

      return data.data;
    },
    enabled: !!chatId && !chatId.startsWith("temp_"),
    refetchOnWindowFocus: false
  });

  const {user: currentUser} = useCurrentUser();

  const isPrivateChat = chat?.type === "private";
  const otherUser = isPrivateChat && chat?.participants.find((p) => p._id !== currentUser?._id);
  const otherUserExists = isPrivateChat && !!otherUser;
  const blockExists = isPrivateChat && !!(isBlocked.blockedBy || isBlocked.blockedUser);
  const userBlockedMe = isBlocked.blockedUser === currentUser?._id;

  // Query para consultar la clave de cifrado del recipiente
  const {data, isLoading: loadingRecipientCryptoKey} = useQuery({
    queryKey: ["recipientCryptoKey", chatId],
    queryFn: async () => {
      if (!otherUser) return null;

      const token = await getToken();

      const {data} = await axiosInstance<{publicKey: JsonWebKey}>({
        method: "GET",
        url: `/crypto-keys/get-user-public-key/${otherUser._id}`,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setRecipientPublicKey(data.publicKey);

      return data;
    },
    retry: 1,
    enabled: !!otherUser,
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    // Escuchar evento de usuario bloqueado/desbloqueado
    socket.on("userBlocked", (data) => {
      const {user, blockedUser, operation, chatId: blockedChatId} = data;

      // Ignorar el evento si no es el chat activo
      if (blockedChatId !== chatId) return;

      if (operation === "unblock") {
        setIsBlocked({
          blockedBy: null,
          blockedUser: null
        });
      }

      if (operation === "block") {
        setIsBlocked({
          blockedBy: user._id,
          blockedUser: blockedUser._id
        });
      }
    });

    return () => {
      socket.off("userBlocked");
    };
  }, [socket, chatId]);

  if (chatError) {
    const isClientError = chatError instanceof AxiosError && chatError.response?.status.toString().startsWith("4");

    if (isClientError && chatError.response?.status === 404) {
      navigate("/messages?type=all", {replace: true});
    }

    toast.error(errorMessage(chatError));
  }

  const isLoadingData = loadingRecipientCryptoKey || isFetching;

  return (
    <div className="flex flex-col w-full h-full">
      <ChatHeader
        chatData={chat || temporaryChat}
        isLoading={isLoadingData}
        headerHeight={headerHeight}
        blockData={isBlocked}
      />

      <ChatContent
        chatData={chat || temporaryChat}
        isLoadingChatData={isLoadingData}
      />

      {/*
        Mostrar el input si:
        1. El chat es privado, no hay bloqueo y el otro usuario existe, o
        2. El chat es grupal (no es privado)
      */}
      {!isLoadingData && (!blockExists && otherUserExists || !isPrivateChat) &&
        <ChatInput
          chatData={chat || temporaryChat}
          wrapperHeight={headerHeight}
          setTemporaryChat={setTemporaryChat}
          chatTypeParam={chatTypeParam}
          recipientPublicKey={recipientPublicKey}
        />
      }

      {/* Mostrar mensaje cuando hay un bloqueo entre ambos usuarios en un chat privado */}
      {!isLoadingData && blockExists &&
        <div className="flex items-center justify-center gap-2 w-full p-3 border-t border-orange-600">
          <IoWarningOutline className="size-8 text-orange-600 shrink-0" />

          <span className="text-sm text-center font-medium text-neutral-600">
            {otherUserExists && userBlockedMe && `No puedes enviar mensajes en esta conversación porque ${otherUser?.fullName.split(" ")[0]} te ha bloqueado.`}

            {otherUserExists && !userBlockedMe && `No puedes enviar mensajes en esta conversación porque bloqueaste a ${otherUser?.fullName.split(" ")[0]}`}
          </span>
        </div>
      }

      {/* Mostrar mensaje cuando el otro usuario de un chat privado elimina su cuenta */}
      {!isLoadingData && isPrivateChat && !otherUser &&
        <div className="flex items-center justify-center gap-2 w-full p-3 border-t border-orange-600">
          <IoWarningOutline className="size-8 text-orange-600 shrink-0" />
          
          <span className="text-sm text-center font-medium text-neutral-600">
            No puedes enviar mensajes en esta conversación porque esta cuenta no existe.
          </span>
        </div>
      }

      {isLoadingData &&
        <div className="flex items-center justify-center gap-2 w-full border-t">
          <Skeleton className="w-full h-[60px] rounded-none" />
        </div>
      }
    </div>
  )
}

export default ChatInbox