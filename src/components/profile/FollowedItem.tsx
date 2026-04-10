import { useRef } from "react";
import { Link } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useFollowOrUnfollowUser } from "@/services/profile";
import { cn } from "@/lib/utils";
import type { FollowedType, UserType } from "@/types/global";

interface Props {
  data: FollowedType;
  userData: UserType | null;
}

const FollowedItem = ({ data, userData }: Props) => {
  const {followedData: {_id: followedId, clerkId: followedClerkId, fullName, username, profilePicture}} = data;
  
  const followBtnRef = useRef<HTMLButtonElement>(null);

  const {userId} = useAuth();

  const {mutate, isPending} = useFollowOrUnfollowUser(followedId, userId);

  return (
    <li className="flex justify-start items-center gap-2 w-full border rounded-md p-2 bg-white shadow overflow-x-auto scrollbar-none">
      <Link
        className="flex justify-start items-center gap-2 w-full"
        to={`/profile/${followedClerkId}`}
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

      {followedClerkId !== userData?.clerkId &&
        <Button
          ref={followBtnRef}
          className={cn("bg-[#4F39F6] hover:bg-red-700 text-white rounded-full cursor-pointer")}
          variant="default"
          size="sm"
          disabled={isPending}
          onClick={() => mutate()}
        >
          Dejar de seguir
        </Button>
      }
    </li>
  );
}

export default FollowedItem