import { Link } from "react-router";
import dayjs from "dayjs";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { MessageType } from "@/types/global";

interface Props {
  messageData: MessageType;
}

/**
 * Item de la bandeja de mensajes para indicar que un usuario
 * ha sido agregado, ha abandonado o ha sido expulsado de un grupo
*/
const UserLeftOrKickedOrAddedMessageItem = ({ messageData }: Props) => {
  const { addedUser, addedBy, userWhoLeft, kickedUser, kickedBy, type } = messageData;

  return (
    <div className="relative flex justify-center items-center w-fit mx-auto">
      {type === "userLeftGroup" &&
        <p className="px-4 py-1 rounded-sm bg-orange-200">
          <Link
            className="whitespace-nowrap"
            to={`/profile/${userWhoLeft?.clerkId}`}
          >
            <span className="text-xs font-semibold text-blue-700">
              {userWhoLeft?.fullName.split(" ")[0]}
            </span>
          </Link>

          {" "}

          <span className="text-xs text-center text-neutral-700 whitespace-nowrap">
            salió del grupo.
          </span>
        </p>
      }

      {type === "userAddedToGroup" &&
        <p className="px-4 py-1 rounded-sm bg-orange-200">
          <Link
            className="whitespace-nowrap"
            to={`/profile/${addedBy?.clerkId}`}
          >
            <span className="text-xs font-semibold text-blue-700 whitespace-nowrap">
              {addedBy?.fullName.split(" ")[0]}
            </span>
          </Link>

          {" "}

          <span className="text-xs text-center text-neutral-700 whitespace-nowrap">
            agregó a
          </span>

          {" "}

          <Link
            className=""
            to={`/profile/${addedUser?.clerkId}`}
          >
            <span className="text-xs font-semibold text-blue-700 whitespace-nowrap">
              {addedUser?.fullName.split(" ")[0]}
            </span>
          </Link>

          {" "}

          <span className="text-xs text-center text-neutral-700 whitespace-nowrap">
            al grupo.
          </span>
        </p>
      }


      {type === "userKickedFromGroup" &&
        <p className="px-4 py-1 rounded-sm bg-orange-200">
          <Link
            className="whitespace-nowrap"
            to={`/profile/${kickedBy?.clerkId}`}
          >
            <span className="text-xs font-semibold text-blue-700 whitespace-nowrap">
              {kickedBy?.fullName.split(" ")[0]}
            </span>
          </Link>

          {" "}

          <span className="text-xs text-center text-neutral-700 whitespace-nowrap">
            eliminó a
          </span>

          {" "}

          <Link
            className="whitespace-nowrap"
            to={`/profile/${kickedUser?.clerkId}`}
          >
            <span className="text-xs font-semibold text-blue-700 whitespace-nowrap">
              {kickedUser?.fullName.split(" ")[0]}
            </span>
          </Link>

          {" "}

          <span className="text-xs text-center text-neutral-700 whitespace-nowrap">
            del grupo.
          </span>
        </p>
      }

      <span
        className="absolute bottom-0 right-0 text-[10px] text-neutral-500 translate-y-[100%]"
        title={dayjs(messageData.createdAt).format("[El] DD/MM/YYYY [a las] hh:mm a")}
      >
        {dayjs(messageData.createdAt).format("DD/MM/YYYY")}
      </span>
    </div>
  )
}

export default UserLeftOrKickedOrAddedMessageItem