import { Link } from "react-router";
import { MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import type { ConnectionType } from "@/dummy-data";

interface Props {
  connectionData: ConnectionType;
  connection: "follower" | "following" | "pending";
}

const FollowerCard = ({ connectionData, connection }: Props) => {
  return (
    <div className="flex justify-start gap-2 p-4 col-span-1 bg-white rounded-md border shadow">
      <Link
        to={`/profile/${connectionData._id}`}
        className="flex items-start h-full shrink-0"
      >
        <Avatar className="w-[40px] h-[40px]">
          <AvatarImage src={connectionData.profile_picture} />
          <AvatarFallback>
            {connectionData.full_name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Link>

      <div className="flex flex-col w-full text-left overflow-hidden">
        <Link
          to={`/profile/${connectionData._id}`}
          className="w-full mb-0 text-neutral-900 font-semibold !-outline-offset-1 truncate"
        >
          {connectionData.full_name}
        </Link>

        <p className="w-full mb-2 text-xs text-neutral-700 truncate">
          @{connectionData.username}
        </p>

        <p className="w-full mb-4 text-sm text-neutral-700 line-clamp-2">
          {connectionData.bio}
        </p>

        <div className="flex justify-between items-center gap-2">
          {connection !== "pending" &&
            <button className="flex justify-center items-center gap-2 w-full px-2 py-2 text-sm text-center text-white rounded-md bg-[#4F39F6] hover:bg-[#331fcf] transition-colors cursor-pointer">
              <MessageSquare className="size-4 text-white" aria-hidden />
              <span>Mensaje</span>
            </button>
          }

          {connection === "follower" &&
            <button
              className="flex justify-center items-center gap-2 w-full px-2 py-2 text-sm text-center text-black bg-neutral-200 rounded-sm hover:bg-neutral-300 transition-colors cursor-pointer"
              onClick={() => {}}
            >
              Eliminar
            </button>
          }

          {connection !== "follower" &&
            <button
              className="flex justify-center items-center gap-2 w-full px-2 py-2 text-sm text-center text-black bg-neutral-200 rounded-sm hover:bg-neutral-300 transition-colors cursor-pointer"
              onClick={() => {}}
            >
              {connection === "following" && "Dejar de seguir"}
              {connection === "pending" && "Aceptar"}
            </button>
          }

          {connection === "pending" &&
            <button
              className="flex justify-center items-center gap-2 w-full px-2 py-2 text-sm text-center text-white bg-destructive rounded-sm hover:bg-destructive/80 transition-colors cursor-pointer"
              onClick={() => {}}
            >
              Rechazar
            </button>
          }
        </div>
      </div>
    </div>
  )
}

export default FollowerCard