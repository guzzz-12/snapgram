import { NavLink } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Input } from "../ui/input";
import { dummyConnectionsData } from "@/dummy-data";

interface Props {
  headerHeight: number;
}

const ChatList = ({ headerHeight }: Props) => {
  return (
    <aside className="flex flex-col w-max max-w-[255px] h-full pb-6 border-r overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
      <div
        style={{
          height: `calc(${headerHeight}px + 1px)`,
        }}
        className="flex flex-col justify-center items-start w-full px-6 bg-white border-b"
      >
        <p className="hidden min-[900px]:block text-lg font-semibold text-neutral-900">Chats</p>

        <search>
          <Input
            className="hidden min-[900px]:block w-full p-2 bg-slate-100 rounded-md"
            type="search"
            placeholder="Buscar..."
          />
        </search>
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

          <div className="hidden min-[900px]:flex flex-col justify-between items-start gap-0 w-full overflow-hidden">
            <p className="w-full text-sm text-neutral-900 font-semibold truncate">
              {user.full_name}
            </p>
            <p className="w-full text-xs text-neutral-700 truncate">@{user.username}</p>
          </div>
        </NavLink>
      ))}
    </aside>
  )
}

export default ChatList