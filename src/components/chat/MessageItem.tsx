import { Link } from "react-router";
import { Twemoji } from "react-emoji-render";
import { ChevronDown } from "lucide-react";
import MessageDropdown from "./MessageDropdown";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import dayJsInstance from "@/utils/dayJsInstance";
import type { MessageType } from "@/types/global";

interface Props {
  currentUserId: string;
  messageData: MessageType;
}

const MessageItem = ({ currentUserId, messageData }: Props) => {
  const isCurrentUserSender = messageData.sender._id === currentUserId;
  const messageUser = messageData.sender;

  return (
    <div className="flex justify-start gap-2 w-full">
      {!isCurrentUserSender &&
        <Link to={`/profile/${messageUser.clerkId}`}>
          <Avatar className="w-[30px] h-[30px] shrink-0 border">
            <AvatarImage src={messageUser.profilePicture} />
            <AvatarFallback>
              {messageUser.fullName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
      }
      <div
        style={{ justifyContent: isCurrentUserSender ? "flex-end" : "flex-start" }}
        className="flex w-full"
      >
        <div className="flex flex-col w-full max-w-[80%] min-[1200px]:w-[40%] px-4 py-2 rounded-md bg-white shadow">
          {/* Header del mensaje */}
          <div className="flex justify-between items-center gap-2 w-full overflow-hidden">
            <Link
              to={`/profile/${messageUser._id}`}
              className="w-full text-sm text-blue-600 font-semibold truncate"
            >
              {messageUser.fullName}
            </Link>

            <MessageDropdown
              messageData={messageData}
              currentUserId={currentUserId}
            >
              <button className="flex justify-center items-center p-1 shrink-0 cursor-pointer">
                <ChevronDown className="size-5 text-neutral-500" aria-hidden />
                <span className="sr-only">
                  Mostrar opciones del mensaje
                </span>
              </button>
            </MessageDropdown>
          </div>
          
          {/* Contenido multimedia del mensaje (si lo hay) */}
          {messageData.type !== "text" && (
            <div className="w-full h-auto mt-2 rounded-md overflow-hidden">
              <img
                className="w-full h-full object-cover"
                src={messageData.fileUrl || ""}
                alt=""
              />
            </div>
          )}
          {/* Contenido de texto del mensaje (si lo tiene) */}
          {messageData.text && (
            <p className="w-full mt-2 text-sm text-neutral-900 whitespace-pre-wrap">
              <Twemoji text={messageData.text} />
            </p>
          )}
          <p
            className="w-full mt-1 text-right text-xs text-neutral-600"
            title={dayJsInstance(messageData.createdAt).format("DD/MM/YYYY - hh:mm A")}
          >
            {dayJsInstance(messageData.createdAt).format("DD/MM/YYYY")}
          </p>
        </div>
      </div>
    </div>
  )
}

export default MessageItem