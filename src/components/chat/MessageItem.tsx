import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useMutation } from "@tanstack/react-query";
import { Twemoji } from "react-emoji-render";
import { FiMoreVertical } from "react-icons/fi";
import { CheckCheck } from "lucide-react";
import { toast } from "sonner";
import MessageDropdown from "./MessageDropdown";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useImagesLighbox } from "@/hooks/useImagesLightbox";
import dayJsInstance from "@/utils/dayJsInstance";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import { socket } from "@/utils/socket";
import dayjs from "@/utils/dayJsInstance";
import { cn } from "@/lib/utils";
import type { MessageType } from "@/types/global";

interface Props {
  currentUserId: string;
  messageData: MessageType;
  chatType: "private" | "group" | undefined;
}

const MessageItem = ({ currentUserId, messageData, chatType }: Props) => {
  const messageRef = useRef<HTMLDivElement>(null);

  const isCurrentUserSender = messageData.sender?._id === currentUserId;
  const messageSender = messageData.sender;
  const senderExists = Boolean(messageData.sender);

  const [isIntersecting, setIsIntersecting] = useState(false);
  
  const {setImages, setInitialIndex, setOpen: setOpenImgsViewer} = useImagesLighbox();

  const {getToken} = useAuth();

  const isSeen = messageData.seenBy.find(el => el.user && el.user._id !== currentUserId);
  const seenAt = isSeen?.seenAt;

  // Observar si el mensaje es visible en el viewport
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, {threshold: 0.5});

    if (messageRef.current) {
      observer.observe(messageRef.current);
    }

    return () => {
      if (messageRef.current) {
        observer.unobserve(messageRef.current);
      }
    }
  }, []);

  // Marcar el mensaje como visto
  useEffect(() => {
    const isRecipient = messageData.sender?._id !== currentUserId;

    if (!isSeen && isIntersecting && isRecipient) {
      socket.emit("messageSeenBy", {
        messageId: messageData._id,
        chatId: messageData.chat,
        userId: currentUserId
      });
    }

    return () => {
      // socket.off("messageSeenBy");
    }
  }, [isIntersecting, socket, currentUserId, messageData, isSeen]);

  const {mutate, isPending} = useMutation({
    mutationFn: async (deleteFor: "me" | "all") => {
      const token = await getToken();

      const {data} = await axiosInstance<{data: MessageType}>({
        method: "DELETE",
        url: `/messages/delete/${messageData.chat}/${messageData._id}`,
        params: {
          deleteFor
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return data;
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    }
  });

  const isMessageDeleted = messageData.deletedFor.includes(currentUserId) || messageData.deletedForAll;

  return (
    <li className="flex justify-start gap-2 w-full">
      {!isCurrentUserSender && chatType === "group" &&
        <Link
          to={senderExists ? `/profile/${messageSender.clerkId}` : "#"}
          className={cn(senderExists ? "pointer-events-auto" : "pointer-events-none")}
        >
          <Avatar className="w-[30px] h-[30px] shrink-0 border">
            <AvatarImage
              className="w-full h-full object-cover"
              src={senderExists ? messageSender.profilePicture : "/default-avatar.webp"}
            />
            
            <AvatarFallback>
              {senderExists ? messageSender.fullName.charAt(0).toUpperCase() : "U"}
            </AvatarFallback>
          </Avatar>
        </Link>
      }

      <div
        ref={messageRef}
        style={{ justifyContent: isCurrentUserSender ? "flex-end" : "flex-start" }}
        className="flex w-full"
      >
        <div className={cn("relative flex flex-col w-fit min-w-[150px] min-[450px]:max-w-[80%] min-[1200px]:max-w-[60%] px-2 py-1 rounded-lg shadow", (isCurrentUserSender && !isMessageDeleted) ? "bg-[#4F39F6]" : isMessageDeleted ? "bg-neutral-50" : "bg-slate-200")}>
          {/* Check de visto */}
          {isSeen && isCurrentUserSender &&
            <div
              className="absolute -bottom-4.5 right-0"
              title={dayjs(seenAt).format("[Visto] DD/MM/YYYY [a las] hh:mm a")}
            >
              <CheckCheck className="size-4.5 text-blue-600 stroke-2" />
            </div>
          }

          {/* Header del mensaje */}
          <div className="flex justify-between items-center gap-2 w-full overflow-hidden">
            {!isCurrentUserSender && chatType === "group" &&
              <Link
                to={senderExists ? `/profile/${messageSender.clerkId}` : "#"}
                className={cn("w-fit text-sm font-semibold truncate text-blue-600", senderExists ? "pointer-events-auto" : "pointer-events-none")}
              >
                {senderExists ? messageSender.fullName : "Usuario de Snapgram"}
              </Link>
            }

            {!isMessageDeleted &&
              <MessageDropdown
                messageData={messageData}
                currentUserId={currentUserId}
                isPending={isPending}
                onDelete={(deleteFor) => mutate(deleteFor)}
              >
                <button className={cn("absolute top-0.5 flex justify-center items-center p-1 shrink-0 cursor-pointer z-10", isCurrentUserSender ? "left-0 translate-x-[-100%]" : "right-0 translate-x-[100%]")}>
                  <FiMoreVertical className="size-4 *:text-neutral-600" aria-hidden />
                  <span className="sr-only">
                    Mostrar opciones del mensaje
                  </span>
                </button>
              </MessageDropdown>
            }
          </div>

          {/* Contenido de texto del mensaje (si lo tiene) */}
          {messageData.text && (
            <p className={cn("w-full text-sm whitespace-pre-wrap", (isCurrentUserSender && !isMessageDeleted) ? "text-neutral-100" : isMessageDeleted ? "text-neutral-500 italic" : "text-neutral-900")}>
              <Twemoji className="[&>img]:!inline break-words" text={messageData.text} />
            </p>
          )}
          
          {/* Contenido multimedia del mensaje (si lo hay) */}
          {messageData.type !== "text" && (
            <div className="grid grid-cols-3 gap-2 w-full h-auto mt-1 overflow-hidden">
              {messageData.fileUrls.map((fileUrl, i) => (
                <button
                  key={fileUrl}
                  className="relative w-full aspect-square bg-neutral-700 overflow-hidden cursor-pointer"
                  onClick={() => {
                    setInitialIndex(i);
                    setImages(messageData.fileUrls);
                    setOpenImgsViewer(true);
                  }}
                >
                  <img
                    className="relative w-full h-full object-contain object-center z-20"
                    src={fileUrl}
                    alt=""
                  />

                  <div
                    className="absolute top-0 left-0 w-full h-full opacity-60 z-0"
                    style={{
                      backgroundImage: `url(${fileUrl})`,
                      backgroundRepeat: "no-repeat",
                      filter: "blur(6px)"
                    }}
                  />
                </button>
              ))}
            </div>
          )}

          <p
            className={cn("w-full mt-1 text-right text-[10px]", (isCurrentUserSender && !isMessageDeleted) ? "text-neutral-300" : "text-neutral-600")}
            title={dayJsInstance(messageData.createdAt).format("DD/MM/YYYY - hh:mm A")}
          >
            {dayJsInstance(messageData.createdAt).format("DD/MM/YYYY")}
          </p>
        </div>
      </div>
    </li>
  )
}

export default MessageItem