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
        className="flex justify-start items-center gap-2 p-2 bg-neutral-100 dark:bg-slate-800/70 hover:bg-neutral-200 dark:hover:bg-slate-800 transition-colors rounded-md"
        to={`/profile/${like.user.clerkId}`}
      >
        <Avatar className="w-7 h-7 shrink-0">
          <AvatarImage
            className="w-full h-full object-cover"
            src={like.user.profilePicture}
          />
          <AvatarFallback className="w-full h-full object-cover">
            {like.user.fullName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <p className="text-xs text-neutral-900 dark:text-slate-100 font-semibold truncate">
          {like.user.fullName}
        </p>
      </Link>
    </li>
  )
}

export default LikeItem