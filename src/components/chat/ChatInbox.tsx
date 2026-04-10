import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { IoWarningOutline } from "react-icons/io5";
import { AxiosError } from "axios";
import { toast } from "sonner";
import ChatHeader from "./ChatHeader";
import ChatContent from "./ChatContent";
import ChatInput from "./ChatInput";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetChatById, useGetRecipientsPublicKeys, useGetTempChatPublicKey } from "@/services/chats";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { PublicKeysType } from "@/repositories/chatsRepository";
import { errorMessage } from "@/utils/errorMessage";
import { socket } from "@/utils/socket";
import type { ChatType } from "@/types/global";

interface Props {
  chatId: string;
  temporaryChat: ChatType | null;
  headerHeight: number;
}

const ChatInbox = (props: Props) => {
  const {chatId, temporaryChat, headerHeight} = props;

  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const chatTypeParam = searchParams.get("type") as "all" | "group" | null;

  const [publicKeys, setPublicKeys] = useState<PublicKeysType[]>([]);

  const [isBlocked, setIsBlocked] = useState<{
    blockedBy: string | null;
    blockedUser: string | null;
  }>({
    blockedBy: null,
    blockedUser: null
  });

  const {user: currentUser} = useCurrentUser();

  // Query para consultar la data del chat
  const {existingChat, blockData, chatError, fetchingExistingChat} = useGetChatById(chatId);

  const chat = existingChat || temporaryChat;
  const isPrivateChat = chat?.type === "private";
  const otherUser = isPrivateChat && chat?.participants.find((p) => p._id !== currentUser?._id);
  const otherUserExists = isPrivateChat && !!otherUser;
  const blockExists = isPrivateChat && !!(isBlocked.blockedBy || isBlocked.blockedUser);
  const userBlockedMe = isBlocked.blockedUser === currentUser?._id;

  // Query para consultar la clave de cifrado del usuario del chat temporal
  const {tempChatPublicKey, loadingTempChatPublicKey} = useGetTempChatPublicKey(chat);

  // Query para consultar la clave de cifrado de todos los recipientes del chat
  // Aplica para chats privados y grupales pero no para chats temporales
  const {publicKeys: recipientsPublicKeys, loadingRecipientsCryptoKey} = useGetRecipientsPublicKeys(chat);

  // Actualizar el state de las claves de cifrado cuando estén disponibles
  useEffect(() => {
    if (recipientsPublicKeys) {
      setPublicKeys(recipientsPublicKeys);
    }

    if (tempChatPublicKey) {
      setPublicKeys(tempChatPublicKey);
    }
  }, [recipientsPublicKeys, tempChatPublicKey]);

  // Verificar si existe un bloqueo entre los miembros del chat
  useEffect(() => {
    if (blockData) {
      setIsBlocked(blockData);
    }
  }, [blockData]);

  // Escuchar evento de usuario bloqueado/desbloqueado
  useEffect(() => {
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

  const isLoadingData = loadingRecipientsCryptoKey || loadingTempChatPublicKey || fetchingExistingChat;

  return (
    <div className="flex flex-col w-full h-full">
      <ChatHeader
        chatData={chat}
        isLoading={isLoadingData}
        headerHeight={headerHeight}
        blockData={isBlocked}
      />

      <ChatContent
        chatData={chat}
        isLoadingChatData={isLoadingData}
      />

      {/*
        Mostrar el input si:
        1. El chat es privado, no hay bloqueo y el otro usuario existe, o
        2. El chat es grupal (no es privado)
      */}
      {!isLoadingData && (!blockExists && otherUserExists || !isPrivateChat) &&
        <ChatInput
          chatData={chat}
          wrapperHeight={headerHeight}
          chatTypeParam={chatTypeParam}
          recipientsPublicKeys={publicKeys}
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