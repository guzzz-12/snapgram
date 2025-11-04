import type { ChatType } from "@/types/global"
import { NavLink } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface Props {
  chatData: ChatType;
}

const ChatItem = ({chatData}: Props) => {
  const {user} = useCurrentUser();

  const otherUser = chatData.participants.find((participant) => participant._id !== user?._id);

  if (!otherUser) return null;

  return (
    <NavLink
      key={chatData._id}
      to={`/messages/${chatData._id}`}
      className={({isActive}) => (
        `flex justify-start items-center gap-2 px-4 py-3 border-b hover:bg-gray-100 cursor-pointer last:mb-0 ${isActive ? "bg-slate-200" : ""}`
      )}
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
        
        <p className="w-full text-xs text-neutral-700 truncate">
          @{otherUser.username}
        </p>
      </div>
    </NavLink>
  )
}

export default ChatItem