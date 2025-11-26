import { Link } from "react-router";
import dayjs from "dayjs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { MessageType } from "@/types/global";

interface Props {
  messageData: MessageType;
}

/**
 * Item de la bandeja de mensajes para indicar que un usuario
 * ha sido agregado, ha abandonado o ha sido expulsado de un grupo
*/
const UserLeftOrKickedOrAddedMessageItem = ({ messageData }: Props) => {
  const { sender, type } = messageData;

  return (
    <div className="flex justify-center items-center w-full">
      <div className="relative flex justify-center items-center w-fit px-4 py-1 rounded-sm bg-orange-200">
        <Link
          className="flex justify-start items-center gap-1"
          to={`/profile/${sender.clerkId}`}
        >
          <Avatar className="w-[20px] h-[20px] shrink-0 rounded-full outline-2 outline-white">
            <AvatarImage
              className="w-full h-full object-cover object-center"
              src={sender.profilePicture}
            />
            <AvatarFallback  className="w-full h-full object-cover object-center">
              {sender.fullName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <span className="text-xs font-semibold text-blue-700">
            {sender.fullName.split(" ")[0]}
          </span>
        </Link>

        &nbsp;

        <p className="w-full text-xs text-center text-neutral-700 truncate">
          {type === "userLeftGroup" && "ha abandonado el grupo"}
          {type === "userKickedFromGroup" && "ha sido expulsado del grupo"}
          {type === "userAddedToGroup" && "fue agregado al grupo"}
        </p>

        <span
          className="absolute bottom-0 right-0 text-[10px] text-neutral-500 translate-y-[100%]"
          title={dayjs(messageData.createdAt).format("[El] DD/MM/YYYY [a las] hh:mm a")}
        >
          {dayjs(messageData.createdAt).format("DD/MM/YYYY")}
        </span>
      </div>
    </div>
  )
}

export default UserLeftOrKickedOrAddedMessageItem