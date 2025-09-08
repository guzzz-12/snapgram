import { NavLink } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { dummyConnectionsData } from "@/dummy-data";

interface Props {
  headerHeight: number;
}

const ChatList = ({ headerHeight }: Props) => {
  return (
    <aside className="flex flex-col w-full max-w-[255px] h-full pb-6 border-r overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
      <div
        style={{
          height: `calc(${headerHeight}px + 1px)`,
        }}
        className="w-full px-6 py-4 bg-white border-b"
      >
        <p className="text-lg font-semibold text-neutral-900">Chats</p>
      </div>

      {dummyConnectionsData.map((user) => (
        <NavLink
          key={user._id}
          to={`/messages/${user._id}`}
          className={({isActive}) => (
            `flex justify-start items-center gap-2 px-4 py-3  border-b hover:bg-gray-100 cursor-pointer last:mb-0 ${isActive ? "bg-gray-200" : ""}`
          )}
        >
          <Avatar className="w-[40px] h-[40px] shrink-0 outline-2 outline-white">
            <AvatarImage src={user.profile_picture} />
            <AvatarFallback>
              {user.full_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col justify-between items-start gap-0 w-full">
            <p className="text-sm font-semibold text-neutral-900">{user.full_name}</p>
            <p className="text-xs text-neutral-700">@{user.username}</p>
          </div>
        </NavLink>
      ))}
    </aside>
  )
}

export default ChatList