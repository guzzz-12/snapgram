import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import type { UserWithStories } from "@/types/global";

interface Props {
  userData: UserWithStories;
  setOpenUserId: (storyId: string | null) => void;
}

const StoryCardRounded = ({ userData, setOpenUserId }: Props) => {
  return (
    <button
      className="relative w-[80px] h-[80px] rounded-full shrink-0 border-4 border-[#4F39F6] cursor-pointer overflow-hidden"
      onClick={() => setOpenUserId(userData._id)}
    >
      <Avatar className="w-full h-full">
        <AvatarImage
          className="w-full h-full"
          src={userData.profilePicture}
          alt={userData.username}
        />
        <AvatarFallback className="w-full h-full">
          {userData.username.charAt(0)}
        </AvatarFallback>
      </Avatar>
    </button>
  )
}

export default StoryCardRounded