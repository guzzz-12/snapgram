import { Link } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import type { LikeType } from "@/types/global";

interface Props {
  like: LikeType;
}

const LikeItem = ({like}: Props) => {
  return (
    <li className="w-full">
      <Link
        className="flex justify-start items-center gap-2 p-2 bg-neutral-100 hover:bg-neutral-200 transition-colors rounded-md"
        to={`/profile/${like.user.clerkId}`}
      >
        <Avatar className="w-7 h-7 shrink-0">
          <AvatarImage src={like.user.profilePicture} />
          <AvatarFallback>
            {like.user.fullName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <p className="text-xs text-neutral-900 font-semibold truncate">
          {like.user.fullName}
        </p>
      </Link>
    </li>
  )
}

export default LikeItem