import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RadioGroupItem } from "@/components/ui/radio-group";
import type { UserType } from "@/types/global";
import { cn } from "@/lib/utils";

interface Props {
  userData: UserType;
}

const PrivateChatsModalItem = ({ userData }: Props) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Label
          id={userData._id}
          className={cn("flex justify-start items-center gap-4 p-2 rounded-md bg-transparent hover:bg-[#4F39F6]/10", userData.hasCryptoKeys ? "cursor-pointer" : "cursor-not-allowed")}
        >
          <div className="flex justify-start items-center gap-2 w-full">
            <Avatar className="w-[45px] h-[45px] shrink-0">
              <AvatarImage
                className="w-full h-full object-cover"
                src={userData.profilePicture || "/default_avatar.webp"}
              />
              <AvatarFallback className="w-full h-full object-cover">
                {userData.fullName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col justify-center items-start gap-1 w-full">
              <p className="font-semibold text-neutral-900">{userData.fullName}</p>
              <p className="text-xs text-neutral-600">@{userData.username}</p>
            </div>
          </div>
          {userData.hasCryptoKeys &&
            <RadioGroupItem
              id={userData._id}
              className="size-6.5 start-0 rounded-full cursor-pointer data-[state=checked]:border-[#4F39F6] data-[state=checked]:bg-[#4F39F6] data-[state=checked]:text-white"
              value={userData._id}
            />
          }
        </Label>
      </TooltipTrigger>

      {!userData.hasCryptoKeys &&
        <TooltipContent>
          <span className="block text-center">
            {userData.fullName.split(" ")[0]} no ha habilitado <br /> el cifrado del chat.
          </span>
        </TooltipContent>
      }
    </Tooltip>
  )
}

export default PrivateChatsModalItem