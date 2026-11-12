import { Link } from "react-router";
import { SquarePen } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import type { UserType } from "@/types/global";

interface Props {
  user: UserType;
}

const ProfileLinkItem = ({ user }: Props) => {
  if (!user) {
    return null;
  }

  return (
    <Link
      to={`/profile/${user.clerkId}`}
      className="flex justify-start items-center gap-2 w-full px-2 py-3 bg-transparent hover:bg-neutral-100 dark:hover:bg-slate-800/70 transition-colors rounded-md"
    >
      <Avatar className="w-[35px] h-[35px] shrink-0">
        <AvatarImage
          className="w-full h-full object-cover" 
          src={user?.profilePicture}
          alt=""
        />
        
        <AvatarFallback>
          {user?.fullName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col w-full overflow-hidden">
        <p className="w-full text-sm text-neutral-900 dark:text-slate-100 font-semibold truncate">
          {user.fullName}
        </p>

        <p className="w-full text-xs text-neutral-700 dark:text-slate-400 truncate">
          @{user.username}
        </p>
      </div>

      <SquarePen className="block w-6 h-6 shrink-0 text-neutral-600 dark:text-slate-400" />
    </Link>
  )
}

export default ProfileLinkItem