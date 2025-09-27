import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import type { StoryType } from "@/types/global";

interface Props {
  storyData: StoryType;
  setOpenStoryId: (storyId: string | null) => void;
}

const StoryCardRounded = ({ storyData, setOpenStoryId }: Props) => {
  return (
    <button
      className="relative w-[80px] h-[80px] rounded-full shrink-0 border-4 border-[#4F39F6] cursor-pointer overflow-hidden"
      onClick={() => setOpenStoryId(storyData._id)}
    >
      <Avatar className="w-full h-full">
        <AvatarImage
          className="w-full h-full"
          src={storyData.user.profilePicture}
          alt={storyData.user.username}
        />
        <AvatarFallback className="w-full h-full">
          {storyData.user.username.charAt(0)}
        </AvatarFallback>
      </Avatar>
    </button>
  )
}

export default StoryCardRounded