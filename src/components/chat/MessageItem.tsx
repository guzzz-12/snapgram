import { Link } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useMutation } from "@tanstack/react-query";
import { Twemoji } from "react-emoji-render";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import MessageDropdown from "./MessageDropdown";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import dayJsInstance from "@/utils/dayJsInstance";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import type { MessageType } from "@/types/global";
import { cn } from "@/lib/utils";

interface Props {
  currentUserId: string;
  messageData: MessageType;
}

const MessageItem = ({ currentUserId, messageData }: Props) => {
  const isCurrentUserSender = messageData.sender._id === currentUserId;
  const messageUser = messageData.sender;

  const {getToken} = useAuth();

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

  const isDeleted = messageData.deletedFor.includes(currentUserId) || messageData.deletedForAll;

  return (
    <li className="flex justify-start gap-2 w-full">
      {!isCurrentUserSender &&
        <Link to={`/profile/${messageUser.clerkId}`}>
          <Avatar className="w-[30px] h-[30px] shrink-0 border">
            <AvatarImage
              className="w-full h-full object-cover"
              src={messageUser.profilePicture}
            />
            
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
        <div className={cn("flex flex-col w-full max-w-[80%] min-[1200px]:w-[50%] px-4 py-2 rounded-md shadow", (isCurrentUserSender && !isDeleted) ? "bg-[#4F39F6]" : isDeleted ? "bg-neutral-50" : "bg-slate-200")}>
          {/* Header del mensaje */}
          <div className="flex justify-between items-center gap-2 w-full overflow-hidden">
            <Link
              to={`/profile/${messageUser.clerkId}`}
              className={cn("max-w-full text-sm font-semibold truncate", (isCurrentUserSender && !isDeleted) ? "text-white" : "text-blue-600")}
            >
              {messageUser.fullName}
            </Link>

            {!isDeleted &&
              <MessageDropdown
                messageData={messageData}
                currentUserId={currentUserId}
                isPending={isPending}
                onDelete={(deleteFor) => mutate(deleteFor)}
              >
                <button className="flex justify-center items-center p-1 shrink-0 cursor-pointer">
                  <ChevronDown className={cn("size-5", isCurrentUserSender ? "text-white" : "text-neutral-500")} aria-hidden />
                  <span className="sr-only">
                    Mostrar opciones del mensaje
                  </span>
                </button>
              </MessageDropdown>
            }
          </div>

          {/* Contenido de texto del mensaje (si lo tiene) */}
          {messageData.text && (
            <p className={cn("w-full text-sm whitespace-pre-wrap", (isCurrentUserSender && !isDeleted) ? "text-neutral-100" : isDeleted ? "text-neutral-500 italic" : "text-neutral-900")}>
              <Twemoji className="[&>img]:!inline break-words" text={messageData.text} />
            </p>
          )}
          
          {/* Contenido multimedia del mensaje (si lo hay) */}
          {messageData.type !== "text" && (
            <div className="grid grid-cols-3 gap-2 w-full h-auto mt-1 overflow-hidden">
              {messageData.fileUrls.map((fileUrl) => (
                <button
                  key={fileUrl}
                  className="relative w-full aspect-square bg-neutral-700 overflow-hidden cursor-pointer"
                  onClick={() => {}}
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
            className={cn("w-full mt-1 text-right text-[10px]", (isCurrentUserSender && !isDeleted) ? "text-neutral-300" : "text-neutral-600")}
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