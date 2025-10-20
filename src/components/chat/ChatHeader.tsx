import type { RefObject } from "react";
import { Link } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import type { UserType } from "@/dummy-data";

interface Props {
  user: UserType;
  headerRef: RefObject<HTMLDivElement | null>;
}

const ChatHeader = ({ user, headerRef }: Props) => {
  return (
    <div
      ref={headerRef}
      className="flex justify-start w-full px-6 py-2 bg-white border-b"
    >
      <Link
        to={`/profile/${user._id}`}
        className="flex justify-start items-center gap-2"
      >
        <Avatar className="w-[50px] h-[50px] shrink-0 outline-2 outline-white">
          <AvatarImage src={user.profile_picture} />
          <AvatarFallback>
            {user.full_name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col justify-between items-start gap-0 w-full">
          <p className="font-semibold text-neutral-900">{user.full_name}</p>
          <p className="text-sm text-neutral-700">@{user.username}</p>
        </div>
      </Link>
    </div>
  )
}

export default ChatHeader