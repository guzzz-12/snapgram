import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useFollowOrUnfollowUser } from "@/services/profile";
import { cn } from "@/lib/utils";
import type { FollowerType, UserType } from "@/types/global";

interface Props {
  data: FollowerType;
  userData: UserType | null;
}

const FollowerItem = ({ data }: Props) => {
  const {followerData: {_id: followerId, clerkId: followerClerkId, fullName, username, profilePicture}, isFollowingBack} = data;
  
  const followBtnRef = useRef<HTMLButtonElement>(null);

  const {userId: currentUserClerkId} = useAuth();

  const {mutate, isPending} = useFollowOrUnfollowUser(followerId, currentUserClerkId);

  // Cambiar dinámicamente el texto del botón de seguir/dejar de seguir
  useEffect(() => {
    const onMouseEnterHandler = () => {
      followBtnRef.current!.textContent = "Dejar de seguir";
    }

    const onMouseLeaveHandler = () => {
      followBtnRef.current!.textContent = "Siguiendo";
    }

    if (isFollowingBack) {
      followBtnRef.current!.addEventListener("mouseenter", onMouseEnterHandler);
      followBtnRef.current!.addEventListener("mouseleave", onMouseLeaveHandler);
    }

    return () => {
      if (followBtnRef.current) {
        followBtnRef.current.removeEventListener("mouseenter", onMouseEnterHandler);
        followBtnRef.current.removeEventListener("mouseleave", onMouseLeaveHandler);
      }
    }
  }, [isFollowingBack]);

  return (
    <li className="flex justify-start items-center gap-2 w-full border rounded-md p-2 bg-white shadow overflow-x-auto scrollbar-none">
      <Link
        className="flex justify-start items-center gap-2 w-full"
        to={`/profile/${followerClerkId}`}
      >
        <div className="flex items-start shrink-0">
          <Avatar className="w-10 h-10">
            <AvatarImage
              className="w-full h-full object-cover"
              src={profilePicture}
            />
            <AvatarFallback className="w-full h-full object-cover">
              {fullName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="flex flex-col justify-start items-start w-full grow overflow-hidden">
          <p className="text-base text-neutral-900 font-semibold truncate">
            {fullName}
          </p>
          <span className="text-xs min-[450px]:text-sm text-neutral-700 truncate">
            @{username}
          </span>
        </div>
      </Link>

      {followerClerkId !== currentUserClerkId &&
        <Button
          ref={followBtnRef}
          className={cn("bg-[#4F39F6] hover:bg-[#331fcf] text-white rounded-full cursor-pointer", isFollowingBack && "hover:text-white hover:bg-red-700")}
          variant="default"
          size="sm"
          disabled={isPending}
          onClick={() => mutate()}
        >
          {isFollowingBack ? "Siguiendo" : "Seguir también"}
        </Button>
      }
    </li>
  );
}

export default FollowerItem