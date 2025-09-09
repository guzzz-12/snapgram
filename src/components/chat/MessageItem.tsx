import { Link } from "react-router";
import { ChevronDown } from "lucide-react";
import MessageDropdown from "./MessageDropdown";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import dayJsInstance from "@/utils/dayJsInstance";
import { dummyUsersData, type MessageType } from "@/dummy-data";

interface Props {
  currentUserId: string;
  messageData: MessageType;
}

const MessageItem = ({ currentUserId, messageData }: Props) => {
  const isCurrentUserSender = messageData.from_user_id === currentUserId;
  const messageUser = dummyUsersData.find((user) => user._id === messageData.from_user_id)!;

  return (
    <div className="flex justify-start gap-2 w-full">
      {!isCurrentUserSender &&
        <Link to={`/profile/${messageData.from_user_id}`}>
          <Avatar className="w-[30px] h-[30px] shrink-0 border">
            <AvatarImage src={messageUser.profile_picture} />
            <AvatarFallback>
              {messageUser.full_name.charAt(0).toUpperCase()}
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
              to={`/profile/${messageData.from_user_id}`}
              className="w-full text-sm text-blue-600 font-semibold truncate"
            >
              {messageUser.full_name}
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
          {messageData.media_url && (
            <div className="w-full h-auto mt-2 rounded-md overflow-hidden">
              <img
                className="w-full h-full object-cover"
                src={messageData.media_url}
                alt=""
              />
            </div>
          )}
          {/* Contenido de texto del mensaje (si lo tiene) */}
          {messageData.text && (
            <p className="w-full mt-2 text-sm text-neutral-900 whitespace-pre-wrap">
              {messageData.text}
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