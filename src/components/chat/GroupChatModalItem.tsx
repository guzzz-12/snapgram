import type { Dispatch, SetStateAction } from "react";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import type { UserType } from "@/types/global";

interface Props {
  userData: UserType;
  setSelectedUsersIds: Dispatch<SetStateAction<string[]>>;
}

const GroupChatModalItem = ({ userData, setSelectedUsersIds }: Props) => {
  const onCheckedChange = (checked: boolean) => {
    if (checked) {
      setSelectedUsersIds((prev) => [...prev, userData._id]);
    } else {
      setSelectedUsersIds((prev) => prev.filter((id) => id !== userData._id));
    }
  };

  return (
    <Label
      id={userData._id}
      className="flex justify-start items-center gap-4 p-2 rounded-md bg-transparent hover:bg-[#4F39F6]/10 cursor-pointer"
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

      <Checkbox
        id={userData._id}
        className="size-6.5 start-0 rounded-full cursor-pointer data-[state=checked]:border-[#4F39F6] data-[state=checked]:bg-[#4F39F6] data-[state=checked]:text-white"
        value={userData._id}
        onCheckedChange={onCheckedChange}
      />
    </Label>
  )
}

export default GroupChatModalItem