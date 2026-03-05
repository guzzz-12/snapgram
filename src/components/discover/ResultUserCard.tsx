import { useRef } from "react";
import { Link } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { MapPin, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useProfileService } from "@/services/profileService";
import { cn } from "@/lib/utils";
import type { SearchUsersResult } from "@/types/global";

interface Props {
  userData: SearchUsersResult;
}

const ResultUserCard = ({ userData }: Props) => {
  const followBtnRef = useRef<HTMLButtonElement>(null);

  const {followOrUnfollowUser} = useProfileService();

  const {userId} = useAuth();

  const {mutate, isPending} = followOrUnfollowUser(userData._id, userId);

  const onMouseEnterHandler = () => {
    if (userData.isFollowing) {
      followBtnRef.current!.textContent = "Dejar de seguir";
    }
  }

  const onMouseLeaveHandler = () => {
    if (userData.isFollowing) {
      followBtnRef.current!.textContent = "Siguiendo";
    }
  }

  return (
    <div className="flex flex-col p-5 border rounded-md bg-white">
      <div className="flex flex-col items-center w-full overflow-hidden">
        <Link to={`/profile/${userData.clerkId}`}>
          <Avatar className="w-[50px] h-[50px] mb-2">
            <AvatarImage
              className="w-full h-full object-cover"
              src={userData.profilePicture}
            />
            <AvatarFallback className="w-full h-full object-cover">
              {userData.fullName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>        
        </Link>

        <Link to={`/profile/${userData.clerkId}`}>
          <p className="w-full text-center font-semibold truncate">
            {userData.fullName}
          </p>
        </Link>

        <p className="w-full text-sm text-center text-neutral-700 truncate">
          @{userData.username}
        </p>
      </div>

      <Separator className="w-full my-3" />

      <p className={cn("w-full mb-4 text-sm text-center line-clamp-4", userData.bio ? "text-neutral-700" : "text-neutral-400 italic")}>
        {`${userData.bio || "Sin biografía"}`}
      </p>

      <div className="flex justify-center items-center gap-2 w-full mb-4">
        <Badge
          className="basis-1/2 bg-neutral-50 rounded-full overflow-hidden"
          variant="outline"
        >
          <MapPin className="shrink-0" />
          <span className="truncate">{userData.location}</span>
        </Badge>
        
        <Badge
          className="basis-1/2 bg-neutral-50 rounded-full overflow-hidden"
          variant="outline"
        >
          <span className="truncate">2 followers</span>
        </Badge>
      </div>

      <div className="flex justify-start items-center gap-2 w-full">
        <Button
          ref={followBtnRef}
          className="grow text-sm text-center text-white bg-[#4F39F6] hover:bg-[#331fcf] transition-all cursor-pointer"
          size="sm"
          disabled={isPending}
          onClick={() => mutate()}
          onMouseEnter={onMouseEnterHandler}
          onMouseLeave={onMouseLeaveHandler}
        >
          {userData.isFollowing ? "Siguiendo" : "Seguir"}
        </Button>

        <Button className="shrink-0 cursor-pointer" size="icon" variant="outline">
          <MessageCircle aria-hidden />
          <span className="sr-only">Enviar mensaje a {userData.fullName}</span>
        </Button>
      </div>
    </div>
  )
}

export default ResultUserCard