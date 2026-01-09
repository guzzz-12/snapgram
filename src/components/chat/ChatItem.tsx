import { useEffect, useState } from "react";
import { NavLink } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import updateLocale from "dayjs/plugin/updateLocale";
import { MdOutlineAttachment } from "react-icons/md";
import { LuDot } from "react-icons/lu";
import { BeatLoader } from "react-spinners";
import UnreadMsgsCounterBadge from "./UnreadMsgsCounterBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUnreadChats } from "@/hooks/useUnreadChats";
import { updateUnreadMessagesCounterCache } from "@/utils/updateMsgsDataCache";
import { axiosInstance } from "@/utils/axiosInstance";
import { decryptMessage } from "@/utils/decryptMessageText";
import type { TypingEventData } from "@/types/socketTypes";
import type { ChatType, MessageType } from "@/types/global";

dayjs.extend(updateLocale);

dayjs.updateLocale("es", {
  relativeTime: {
    // Definición de futuro y pasado
    future: "en %s", // Usar solo %s para evitar "en x m" (que no es el formato pedido)
    past: "%s",     // Usar el sufijo manualmente en cada unidad

    // Unidades de tiempo personalizadas para el formato corto
    s: "1 min", // Segundos: "1 min (hace segundos)"
    m: "1 min", // Un minuto: "1 min"
    mm: "%d min", // Múltiples minutos: "x min"
    h: "1 h", // Una hora: "1 h"
    hh: "%d h", // Múltiples horas: "x h"
    d: "1 d", // Un día: "1 d"
    dd: "%d d", // Múltiples días: "x d"
    M: "1 mes", // Un mes: "1 mes"
    MM: "%d meses", // Múltiples meses
    y: "1 a", // Un año: "1 a"
    yy: "%d a" // Múltiples años: "x a"
  }
})

interface Props {
  chatData: ChatType;
  usersTyping: TypingEventData[];
}

const ChatItem = ({chatData, usersTyping}: Props) => {
  const {user} = useCurrentUser();

  const chatParticipants = chatData?.participants || [];

  const otherUser = chatData.type === "private" ? chatParticipants.find((p) => p._id !== user?._id) : chatData.groupAdmin;

  const otherUserExists = chatData.type === "private" && !!otherUser;

  const [lastMessage, setLastMessage] = useState<MessageType | null>(null);

  const {getToken} = useAuth();
  
  const queryClient = useQueryClient();

  const {removeFromUnreadChats} = useUnreadChats();

  // Desencriptar el último mensaje del chat
  useEffect(() => {
    if (!chatData.lastMessage || !user) return;

    decryptMessage(chatData.lastMessage, user._id)
    .then((msg) => {
      setLastMessage(msg);
    })
    .catch((error) => {
      console.error(error.message);
    });

    return () => {
      setLastMessage(null);
    };
  }, [chatData, user]);

  // Mutation para restablecer el contador de mensajes sin leer del usuario en el chat
  const {mutate: resetUnreadMessagesCounter, isPending} = useMutation({
    mutationFn: async () => {
      const token = await getToken();

      const {data} = await axiosInstance<{data: ChatType}>({
        method: "PUT",
        url: `/chats/reset-unread-count/${chatData._id}`,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return data;
    },
    onSuccess: (data) => {
      updateUnreadMessagesCounterCache({chat: data.data, queryClient});
    }
  });

  // Actualizar el contador de mensajes sin leer del chat al hacer clic en el chat
  // Restar 1 al contador global de chats con mensajes sin leer
  const onClickHandler = () => {
    const hasUnreadMessages = chatData.unseenMessages.some((counter) => {
      return counter.user === user?._id;
    });

    if (hasUnreadMessages && !isPending) {
      resetUnreadMessagesCounter();
      removeFromUnreadChats(chatData._id);
    }
  }

  if (!user) return null;

  // Obtener el contador de mensajes sin leer del usuario en el chat
  const unReadMessagesCounter = chatData.unseenMessages?.find(counter => {
    return counter.user === user._id
  });

  // Verificar si el usuario está escribiendo
  const isUserTyping = usersTyping.find((typing) => {
    return (typing.chatId == chatData._id && typing.user._id !== user._id);
  });

  // Si el chat es private y el otro usuario no existe, mostrar el avatar default
  const avatar = chatData.type === "private" && otherUserExists ? otherUser.profilePicture : chatData.type === "private" && !otherUserExists ? "/default-avatar.webp" : chatData.groupPicture;

  // Si el chat es private y el otro usuario no existe, mostrar "Usuario de Snapgram"
  const name = chatData.type === "private" && otherUserExists ? otherUser.fullName : chatData.type === "private" && !otherUserExists ? "Usuario de Snapgram" : chatData.groupName;

  return (
    <NavLink
      key={chatData._id}
      className={({isActive}) => (
        `flex justify-center min-[950px]:justify-start items-center gap-2 p-2 min-[700px]:px-4 min-[700px]:py-3 border-b hover:bg-gray-100 cursor-pointer last:mb-0 ${isActive ? "bg-[#4F39F6]/10" : ""}`
      )}
      to={`/messages/${chatData._id}`}
      onClick={onClickHandler}
    >
      <div className="relative shrink-0">
        <Avatar className="w-[40px] h-[40px] outline-2 outline-[#4F39F6]">
          <AvatarImage
            className="w-full h-full object-cover"
            src={avatar!}
          />
          <AvatarFallback>
            {name?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Contador de mensajes sin leer */}
        <div className="absolute -bottom-1 -right-1 z-10">
          <UnreadMsgsCounterBadge
            className="flex min-[950px]:hidden"
            counter={unReadMessagesCounter}
          />
        </div>

        {/* Indicador de usuario que está escribiendo */}
        {isUserTyping &&
          <div className="absolute top-0 left-0 flex justify-center items-center w-full h-full bg-white/50 rounded-full z-5">
            <BeatLoader
              className="opacity-80"
              size={8}
              color="#4F39F6"
              speedMultiplier={0.8}
            />
          </div>
        }
      </div>

      <div className="hidden min-[950px]:flex flex-col justify-between items-start gap-0 w-full overflow-hidden">
        <p className="w-full text-sm text-neutral-900 font-semibold truncate">
          {name}
        </p>
        
        {/* Mostrar el último mensaje del chat */}
        {lastMessage && !isUserTyping &&
          <div className="flex items-center gap-0.5 w-full text-xs text-neutral-700 font-light overflow-hidden">
            <span className="shrink-0">
              {lastMessage.sender._id === user._id && "Tú:"}
            </span>

            <p className="truncate">
              {lastMessage.text}
            </p>

            {lastMessage.type !== "text" &&
              <p className="truncate">
                <MdOutlineAttachment className="inline shrink-0" aria-hidden />
                {" "}
                Archivo adjunto
              </p>
            }

            <LuDot className="size-2 shrink-0" aria-hidden />

            <p className="shrink-0">
              {dayjs(lastMessage.createdAt).fromNow().replace("hace ", "")}
            </p>
          </div>
        }

        {isUserTyping &&
          <div className="w-full text-xs text-neutral-700 font-light italic">
            <span className="shrink-0">
              Escribiendo...
            </span>
          </div>
        }
      </div>

      {/* Contador de mensajes sin leer */}
      <UnreadMsgsCounterBadge
        className="hidden min-[950px]:flex"
        counter={unReadMessagesCounter}
      />
    </NavLink>
  )
}

export default ChatItem