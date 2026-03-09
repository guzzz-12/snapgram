import type { JSX } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfileService } from "@/services/profileService";

interface Props {
  isOpen: boolean;
  userClerkId: string;
  children: JSX.Element;
  setIsOpen: (isOpen: boolean) => void;
}

const UserProfileTooltip = ({isOpen, userClerkId, children, setIsOpen}: Props) => {
  const {getUserProfile} = useProfileService();

  const {userData, loadingUser, userError} = getUserProfile(userClerkId, true, isOpen);

  return (
    <Tooltip
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <TooltipTrigger asChild>
        {children}
      </TooltipTrigger>

      <TooltipContent
        className="p-0 rounded-md border bg-neutral-200 shadow overflow-hidden [&_svg]:hidden!"
        sideOffset={10}
      >
        <div
          className="relative"
          style={{
            backgroundImage: userData?.coverPicture ? `url(${userData.coverPicture})` : "none",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat"
          }}
        >
          {loadingUser &&
            <div className="flex justify-center items-center w-[300px] aspect-video">
              <Skeleton className="w-full h-full bg-neutral-500" />
            </div>
          }

          {userData && !loadingUser &&
            <>
              <div className="flex flex-col w-[300px] aspect-video">
                <div className="flex justify-start items-center gap-3 p-4 overflow-hidden z-10">
                  <Avatar className="w-[70px] h-[70px] shrink-0">
                    <AvatarImage
                      className="w-full h-full object-cover" 
                      src={userData.profilePicture}
                    />
                    <AvatarFallback>
                      {userData.fullName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex flex-col w-full overflow-hidden">
                    <p className="w-full text-base text-neutral-900 font-semibold truncate">
                      {userData.fullName}
                    </p>

                    <p className="w-full text-sm text-neutral-700 truncate">
                      @{userData.username}
                    </p>
                  </div>
                </div>

                <div className="flex justify-center items-center gap-6 w-full mt-auto pt-4 pb-2 bg-gradient-to-t from-white from-0% to-transparent">
                  <div className="flex flex-col justify-between items-center gap-0">
                    <p className="text-sm text-black font-semibold">
                      {userData.followersCount}
                    </p>

                    <p className="text-sm text-neutral-700">
                      seguidores
                    </p>
                  </div>

                  <div className="flex flex-col justify-between items-center gap-0">
                    <span className="text-sm text-black font-semibold">
                      {userData.followingCount}
                    </span>

                    <span className="text-sm text-neutral-700">
                      siguiendo
                    </span>
                  </div>

                  <div className="flex flex-col justify-between items-center gap-0">
                    <span className="text-sm text-black font-semibold">
                      {userData.postsCount}
                    </span>

                    <span className="text-sm text-neutral-700">
                      publicaciones
                    </span>
                  </div>
                </div>
              </div>

              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white from-0% to-transparent to-55% z-0" />
            </>
          }
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

export default UserProfileTooltip