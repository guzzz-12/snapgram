import { Link } from "react-router";
import { Twemoji } from "react-emoji-render";
import { ChevronDown } from "lucide-react";
import MessageDropdown from "./MessageDropdown";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import dayJsInstance from "@/utils/dayJsInstance";
import { cn } from "@/lib/utils";
import type { MessageType } from "@/types/global";

interface Props {
  currentUserId: string;
  messageData: MessageType;
}

const MessageItem = ({ currentUserId, messageData }: Props) => {
  const isCurrentUserSender = messageData.sender._id === currentUserId;
  const messageUser = messageData.sender;

  return (
    <li className="flex justify-start gap-2 w-full">
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
        <div className={cn("flex flex-col w-full max-w-[80%] min-[1200px]:w-[40%] px-4 py-2 rounded-md shadow", isCurrentUserSender ? "bg-[#4F39F6]/5" : "bg-slate-100")}>
          {/* Header del mensaje */}
          <div className="flex justify-between items-center gap-2 w-full overflow-hidden">
            <Link
              to={`/profile/${messageUser.clerkId}`}
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

          {/* Contenido de texto del mensaje (si lo tiene) */}
          {messageData.text && (
            <p className="w-full text-sm text-neutral-900 whitespace-pre-wrap">
              <Twemoji className="[&>img]:!inline" text={messageData.text} />
            </p>
          )}
          
          {/* Contenido multimedia del mensaje (si lo hay) */}
          {messageData.type !== "text" && (
            <div className="grid grid-cols-3 gap-2 w-full h-auto mt-1 overflow-hidden">
              {messageData.fileUrls.map((fileUrl) => (
                <button
                  key={fileUrl}
                  style={{
                    backgroundImage: `url(${fileUrl})`,
                    backgroundRepeat: "no-repeat",
                    backdropFilter: "blur(15px)"
                  }}
                  className="w-full aspect-square overflow-hidden cursor-pointer"
                  onClick={() => {}}
                >
                  <img
                    className="w-full h-full object-contain object-center"
                    src={fileUrl}
                    alt=""
                  />
                </button>
              ))}
            </div>
          )}

          <p
            className="w-full mt-1 text-right text-xs text-neutral-600"
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