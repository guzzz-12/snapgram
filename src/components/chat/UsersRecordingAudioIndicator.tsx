import { FaMicrophone } from "react-icons/fa";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { TypingEventData } from "@/types/socketTypes";

interface Props {
  usersRecordingAudio: TypingEventData[];
}

const UsersRecordingAudioIndicator = ({ usersRecordingAudio }: Props) => {
  if (usersRecordingAudio.length === 0) {
    return null;
  }

  return (
    <div className="flex justify-start items-center gap-2">
      <div className="flex justify-start items-center gap-2">
        {usersRecordingAudio.map((el, i) => (
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

        <FaMicrophone className="size-5 text-[#4F39F6] animate-pulse duration-100" />
      </div>
    </div>
  )
}

export default UsersRecordingAudioIndicator