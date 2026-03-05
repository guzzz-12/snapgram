import { useRef } from "react";
import { Link } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useProfileService } from "@/services/profileService";
import type { SearchUsersResult } from "@/types/global";
import { cn } from "@/lib/utils";

interface Props {
  userData: SearchUsersResult;
}

const UserSearchResultItem = ({ userData }: Props) => {
  const followBtnRef = useRef<HTMLButtonElement>(null);

  const {userId} = useAuth();

  const {followOrUnfollowUser} = useProfileService();

  // Mutation para seguir o dejar de seguir al usuario
  const {mutate, isPending} = followOrUnfollowUser(userData._id, userId);

  const onMouseEnterHandler = () => {
    if (!followBtnRef.current) return;

    if (userData.isFollowing) {
      followBtnRef.current.textContent = "Dejar de seguir";
    }
  };

  const onMouseLeaveHandler = () => {
    if (!followBtnRef.current) return;

    if (userData.isFollowing) {
      followBtnRef.current.textContent = "Siguiendo";
    }
  };

  return (
    <li className="flex justify-start items-center gap-2 w-full p-3 rounded-md bg-transparent hover:bg-neutral-200 transition-colors cursor-pointer">
      <Link
        className={cn("flex justify-start items-center gap-2 w-full overflow-hidden", isPending && "pointer-events-none")}
        to={`/profile/${userData.clerkId}`}
      >
        <Avatar className="w-[40px] h-[40px] shrink-0">
          <AvatarImage
            className="w-full h-full object-cover"
            src={userData.profilePicture || "/default_avatar.webp"}
            alt=""
          />

          <AvatarFallback className="w-full h-full object-cover">
            {userData.fullName.charAt(0)}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col w-full overflow-hidden">
          <p className="text-sm font-semibold truncate">
            {userData.fullName}
          </p>

          <p className="text-xs text-neutral-600 truncate">
            @{userData.username}
          </p>
        </div>
      </Link>

      <Button
        ref={followBtnRef}
        className={cn("bg-[#4F39F6] hover:bg-[#331fcf] text-white rounded-full cursor-pointer", userData.isFollowing && "hover:bg-red-700")}
        variant="default"
        size="sm"
        disabled={isPending}
        onClick={() => mutate()}
        onMouseEnter={onMouseEnterHandler}
        onMouseLeave={onMouseLeaveHandler}
      >
        {userData.isFollowing ? "Siguiendo" : "Seguir"}
      </Button>
    </li>
  )
}

export default UserSearchResultItem