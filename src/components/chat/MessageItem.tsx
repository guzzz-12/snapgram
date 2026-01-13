import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useMutation } from "@tanstack/react-query";
import { Twemoji } from "react-emoji-render";
import { FiMoreVertical } from "react-icons/fi";
import { CheckCheck } from "lucide-react";
import { toast } from "sonner";
import MessageDropdown from "./MessageDropdown";
import MessageInputForm from "./MessageInputForm";
import MessageHistoryModal from "./MessageHistoryModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useImagesLighbox } from "@/hooks/useImagesLightbox";
import dayJsInstance from "@/utils/dayJsInstance";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import { socket } from "@/utils/socket";
import dayjs from "@/utils/dayJsInstance";
import { decryptMessage } from "@/utils/decryptMessageText";
import type { ChatType, MessageType, UserType } from "@/types/global";
import { cn } from "@/lib/utils";

interface Props {
  currentUser: UserType;
  messageData: MessageType;
  chatData: ChatType | null | undefined;
  chatType: "private" | "group" | undefined;
}

const MessageItem = ({ currentUser, messageData, chatData, chatType }: Props) => {
  const messageRef = useRef<HTMLDivElement>(null);

  const isCurrentUserSender = messageData.sender?._id === currentUser._id;
  const messageSender = messageData.sender;
  const senderExists = Boolean(messageData.sender);

  const [isIntersecting, setIsIntersecting] = useState(false);
  const [isEditingMessage, setIsEditingMessage] = useState(false);
  const [message, setMessage] = useState<MessageType | null>(null);
  const [messageText, setMessageText] = useState("");
  const [openMsgHistoryModal, setOpenMsgHistoryModal] = useState(false);

  // Descifrar el texto del mensaje cifrado
  useEffect(() => {
    decryptMessage(messageData, currentUser._id)
    .then(msg => {
      setMessage(msg);
      setMessageText(msg.text || "");
    });
  }, [messageData, currentUser]);
  
  const {setImages, setInitialIndex, setOpen: setOpenImgsViewer} = useImagesLighbox();

  const {getToken} = useAuth();

  const isSeen = message?.seenBy.find(el => el.user && el.user._id !== currentUser._id);
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
    if (!message) return;

    const isRecipient = message.sender?._id !== currentUser._id;

    if (!isSeen && isIntersecting && isRecipient) {
      socket.emit("messageSeenBy", {
        messageId: message._id,
        chatId: message.chat,
        userId: currentUser._id
      });
    }

    return () => {
      // socket.off("messageSeenBy");
    }
  }, [isIntersecting, socket, currentUser._id, message, isSeen]);

  // Mutation para editar el mensaje
  const {mutate: updateMessage, isPending: isSubmitting} = useMutation({
    mutationFn: async () => {
      if (!message) return;

      const token = await getToken();

      if (messageText === message.text) return message;

      const {data} = await axiosInstance<{data: MessageType}>({
        method: "PUT",
        url: `/messages/edit/${message.chat}/${message._id}`,
        data: {text: messageText},
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      return data;
    },
    onSuccess: () => {
      setIsEditingMessage(false);
    },
    onError: (error) => {
      toast.error(errorMessage(error));
      setMessageText(message?.text || "");
    }
  });

  // Mutation para eliminar el mensaje
  const {mutate, isPending} = useMutation({
    mutationFn: async (deleteFor: "me" | "all") => {
      if (!message) return;

      const token = await getToken();

      const {data} = await axiosInstance<{data: MessageType}>({
        method: "DELETE",
        url: `/messages/delete/${message.chat}/${message._id}`,
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

  if (!message) return null;

  const parsedFilesUrls = message.fileUrls ? JSON.parse(message.fileUrls) as string[] : [];

  const isMessageDeleted = message.deletedFor.includes(currentUser._id) || message.deletedForAll;

  return (
    <li className="flex justify-start gap-2 w-full">
      <MessageHistoryModal
        messageData={messageData}
        isOpen={openMsgHistoryModal}
        setIsOpen={setOpenMsgHistoryModal}
      />

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
                messageData={message}
                currentUserId={currentUser._id}
                isPending={isPending}
                onEdit={setIsEditingMessage}
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
          {message.text && !isEditingMessage && (
            <p className={cn("w-full text-sm whitespace-pre-wrap", (isCurrentUserSender && !isMessageDeleted) ? "text-neutral-100" : isMessageDeleted ? "text-neutral-500 italic" : "text-neutral-900")}>
              <Twemoji className="[&>img]:!inline break-words" text={message.text} />
            </p>
          )}
          
          {/* Input de edición del mensaje */}
          {isEditingMessage &&
            <div className="flex flex-col gap-1 w-full">
              <MessageInputForm
                currentUser={currentUser}
                chatData={chatData}
                messageText={messageText || ""}
                setMessageText={setMessageText}
                submitting={isSubmitting}
                className="bg-white"
                isSending={false}
              />

              <div className="flex justify-end items-center gap-2 w-full">
                <Button
                  className="p-0 text-neutral-400 cursor-pointer"
                  variant="link"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => setIsEditingMessage(false)}
                >
                  Cancelar
                </Button>

                <Button
                  className="p-0 text-white cursor-pointer"
                  variant="link"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => updateMessage()}
                >
                  Guardar
                </Button>
              </div>
            </div>
          }
          
          {/* Imágenes del mensaje (si las hay) */}
          {["image", "imageWithText"].includes(message.type) && (
            <div
              style={{
                // Mostrar maximo 4 columnas, generar una fila por cada 4 imagenes
                gridTemplateColumns: `repeat(${parsedFilesUrls.length >= 4 ? 4 : parsedFilesUrls.length}, 1fr)`,
                gridTemplateRows: "repeat(auto-fill, 1fr)"
              }}
              className="grid gap-2 w-full h-auto mt-1 overflow-hidden"
            >
              {parsedFilesUrls.map((fileUrl, i) => (
                <button
                  key={fileUrl}
                  className="relative w-full max-w-[150px] aspect-square bg-neutral-700 overflow-hidden cursor-pointer"
                  onClick={() => {
                    setInitialIndex(i);
                    setImages(parsedFilesUrls);
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

          {/* Mensaje de audio */}
          {message.type === "audio" &&
          <div className="w-full p-2 overflow-hidden">
            <audio
              className="block w-full min-w-[200px] h-[40px] rounded-full shadow"
              controls
              src={parsedFilesUrls[0]}
            />
          </div>
          }

          {/* Historial de cambios del mensaje y fecha del mensaje */}
          <div className="flex justify-between items-center gap-4 w-full my-1.5">
            {message.history && message.history.length > 0 &&
              <Button
                className={cn("h-auto p-0 text-xs underline cursor-pointer", isCurrentUserSender ? "text-slate-300" : "text-blue-600")}
                variant="link"
                onClick={() => setOpenMsgHistoryModal(true)}
              >
                Editado
              </Button>
            }

            <p
              className={cn("w-full text-right text-[10px]", (isCurrentUserSender && !isMessageDeleted) ? "text-neutral-300" : "text-neutral-600")}
              title={dayJsInstance(message.createdAt).format("DD/MM/YYYY - hh:mm A")}
            >
              {dayJsInstance(message.createdAt).format("DD/MM/YYYY")}
            </p>
          </div>
        </div>
      </div>
    </li>
  )
}

export default MessageItem