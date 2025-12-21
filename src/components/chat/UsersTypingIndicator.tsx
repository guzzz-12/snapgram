import { BeatLoader } from "react-spinners";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import type { TypingEventData } from "@/types/socketTypes";

interface Props {
  usersTyping: TypingEventData[];
}

const UsersTypingIndicator = ({ usersTyping }: Props) => {
  if (usersTyping.length === 0) {
    return null;
  }

  return (
    <div className="flex justify-start items-center gap-2">
      {usersTyping.map((el, i) => (
        <div
          key={el.user._id}
          className="flex justify-start items-center gap-1"
        >
          <Avatar
            style={{
              transform: `translateX(-${i > 0 ? 10 : 0}px)`
            }}
            className="w-5 h-5 shrink-0 outline-2 outline-white"
          >
            <AvatarImage
              className="w-full h-full object-cover"
              src={el.user.profilePicture}
            />

            <AvatarFallback className="w-full h-full object-cover">
              {el.user.fullName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      ))}

      <BeatLoader
        className="opacity-80"
        size={9}
        color="#4F39F6"
        speedMultiplier={0.8}
      />
    </div>
  )
}

export default UsersTypingIndicator