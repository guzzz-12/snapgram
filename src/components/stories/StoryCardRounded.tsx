import { Link } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { UsersHavingStories } from "@/types/global";

interface Props {
  userData: UsersHavingStories;
}

const StoryCardRounded = ({ userData }: Props) => {
  const { user } = useCurrentUser();

  return (
    <div className="flex flex-col justify-between items-center gap-0.5 w-[80px] overflow-hidden">
      <Link
        className="relative w-[80px] h-[80px] rounded-full shrink-0 border-4 border-[#4F39F6] cursor-pointer overflow-hidden"
        to={`/stories/${userData.username}`}
      >
        <Avatar className="w-full h-full">
          <AvatarImage
            className="w-full h-full object-cover"
            src={userData.profilePicture || "/default_avatar.webp"}
            alt={userData.username}
          />
          <AvatarFallback className="w-full h-full object-cover">
            {userData.username.charAt(0)}
          </AvatarFallback>
        </Avatar>
      </Link>

      <p className="w-full text-center text-sm text-neutral-700 truncate">
        {user?._id === userData._id ? "Tu historia" : userData.username}
      </p>
    </div>
  )
}

export default StoryCardRounded