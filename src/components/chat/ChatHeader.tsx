import type { RefObject } from "react";
import { Link } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { ChatType } from "@/types/global";

interface Props {
  chatData: ChatType | null;
  headerRef: RefObject<HTMLDivElement | null>;
}

const ChatHeader = ({ chatData, headerRef }: Props) => {
  const {user: currentUser} = useCurrentUser();

  const chatParticipants = chatData?.participants || [];

  // Si el chat es privado, mostrar el avatar del otro usuario
  // Si el chat es de grupo, mostrar el avatar del admin del grupo
  const recipient = chatData?.type === "private" ? chatParticipants.find((p) => p._id !== currentUser?._id) : chatData?.groupAdmin;

  if (!recipient) return null;

  return (
    <div
      ref={headerRef}
      className="flex justify-start w-full px-6 py-2 bg-white border-b"
    >
      <Link
        to={`/profile/${recipient.clerkId}`}
        className="flex justify-start items-center gap-2"
      >
        <Avatar className="w-[50px] h-[50px] shrink-0 outline-2 outline-white">
          <AvatarImage 
            className="w-full h-full object-cover" 
            src={recipient.profilePicture} 
            // src={chatData?.type === "group" ? chatData.groupPicture : recipient.profilePicture} 
          />
          
          <AvatarFallback>
            {chatData?.type === "group" ? "👥" : recipient.fullName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col justify-between items-start gap-0 w-full">
          <p className="font-semibold text-neutral-900">
            {chatData?.type === "group" ? chatData.groupName : recipient.fullName}
          </p>  

          {chatData?.type !== "group" &&
            <p className="text-sm text-neutral-700">
              @{recipient.username}
            </p>
          }
        </div>
      </Link>
    </div>
  )
}

export default ChatHeader