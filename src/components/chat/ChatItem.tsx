import { NavLink } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import updateLocale from "dayjs/plugin/updateLocale";
import { MdOutlineAttachment } from "react-icons/md";
import { LuDot } from "react-icons/lu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUnreadChats } from "@/hooks/useUnreadChats";
import { updateUnreadMessagesCounterCache } from "@/utils/updateMsgsDataCache";
import { axiosInstance } from "@/utils/axiosInstance";
import type { ChatType } from "@/types/global";

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
}

const ChatItem = ({chatData}: Props) => {
  const {user} = useCurrentUser();

  const otherUser = chatData.participants.find((participant) => participant._id !== user?._id);

  const lastMessage = chatData.lastMessage;

  const {getToken} = useAuth();
  
  const queryClient = useQueryClient();

  const {unreadChats, setUnreadChats} = useUnreadChats();

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
      setUnreadChats(unreadChats - 1);
    }
  }

  if (!otherUser || !user) return null;

  // Obtener el contador de mensajes sin leer del usuario en el chat
  const unReadMessagesCounter = chatData.unseenMessages.find(counter => {
    return counter.user === user._id
  })!

  return (
    <NavLink
      key={chatData._id}
      className={({isActive}) => (
        `flex justify-start items-center gap-2 px-4 py-3 border-b hover:bg-gray-100 cursor-pointer last:mb-0 ${isActive ? "bg-slate-200" : ""}`
      )}
      to={`/messages/${chatData._id}`}
      onClick={onClickHandler}
    >
      <Avatar className="w-[40px] h-[40px] shrink-0 outline-2 outline-white">
        <AvatarImage
          className="w-full h-full object-cover"
          src={otherUser.profilePicture}
        />
        <AvatarFallback>
          {otherUser.username.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="hidden min-[900px]:flex flex-col justify-between items-start gap-0 w-full overflow-hidden">
        <p className="w-full text-sm text-neutral-900 font-semibold truncate">
          {otherUser.fullName}
        </p>
        
        {/* Mostrar el último mensaje del chat */}
        {lastMessage &&
          <div className="flex items-center gap-0.5 w-full text-xs text-neutral-700 font-light overflow-hidden">
            <span className="shrink-0">
              {lastMessage.sender === user._id && "Tú:"}
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
      </div>

      {/* Mostrar la cantidad de mensajes no leidos en el chat */}
      {unReadMessagesCounter.count > 0 &&
        <div className="flex justify-center items-center min-w-[18px] h-[18px] p-1 bg-red-600 rounded-full shrink-0 outline-2 outline-white">
          <span className="text-xs font-semibold text-white">
            {unReadMessagesCounter.count > 99 ? "99+" : unReadMessagesCounter.count}
          </span>
        </div>
      }
    </NavLink>
  )
}

export default ChatItem