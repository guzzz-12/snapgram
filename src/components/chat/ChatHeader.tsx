import type { RefObject } from "react";
import { Link } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import type { UserType } from "@/types/global";

interface Props {
  recipient: UserType;
  headerRef: RefObject<HTMLDivElement | null>;
}

const ChatHeader = ({ recipient, headerRef }: Props) => {
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
          />
          
          <AvatarFallback>
            {recipient.fullName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col justify-between items-start gap-0 w-full">
          <p className="font-semibold text-neutral-900">{recipient.fullName}</p>
          <p className="text-sm text-neutral-700">@{recipient.username}</p>
        </div>
      </Link>
    </div>
  )
}

export default ChatHeader