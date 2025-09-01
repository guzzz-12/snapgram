import { Link } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import type { ConnectionType } from "@/dummy-data";
import { MessageSquare } from "lucide-react";

interface Props {
  connectionData: ConnectionType;
  connection: "follower" | "following" | "pending" | "connection";
}

const FollowerCard = ({ connectionData, connection }: Props) => {
  return (
    <div className="flex justify-start gap-2 p-4 col-span-1 bg-white rounded-md border shadow">
      <Link
        to={`/profile/${connectionData._id}`}
        className="flex items-start h-full shrink-0"
      >
        <Avatar>
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

        <p className="w-full mb-4 text-xs text-neutral-700 line-clamp-2">
          {connectionData.bio}
        </p>

        <div className="flex justify-between items-center gap-2">
          <Link
            to={`/profile/${connectionData._id}`}
            className="flex justify-center items-center gap-2 w-full px-2 py-1.5 text-xs text-center text-white bg-blue-600 rounded-sm hover:bg-blue-700 transition-colors"
          >
            Ver perfil
          </Link>

          {connection !== "follower" &&
            <button
              className="flex justify-center items-center gap-2 w-full px-2 py-1.5 text-xs text-center text-black bg-neutral-200 rounded-sm hover:bg-neutral-300 transition-colors cursor-pointer"
              onClick={() => {}}
            >
              {connection === "following" && "Dejar de seguir"}
              {connection === "pending" && "Aceptar"}
              {connection === "connection" && (
                <div className="flex justify-center items-center gap-1">
                  <MessageSquare className="size-4 text-neutral-700" />
                  <span>Mensaje</span>
                </div>
              )}
            </button>
          }
        </div>
      </div>
    </div>
  )
}

export default FollowerCard