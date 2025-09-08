import { useEffect, useRef, useState } from "react";
import { Link, Navigate, NavLink, useParams } from "react-router";
import { toast } from "sonner";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { dummyUsersData } from "@/dummy-data";

const ChatBoxPage = () => {
  const headerRef = useRef<HTMLDivElement>(null);
  const {userId} = useParams<{userId: string}>();

  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.clientHeight);
    }
  }, [userId]);
  
  const user = dummyUsersData.find((user) => user._id === userId);

  if (!user) {
    toast.error("Usuario no encontrado.");
    return <Navigate to="/" replace />
  }

  return (
    <main className="flex w-full h-screen">
      <SidebarTrigger className="absolute block md:hidden top-4 left-4 cursor-pointer z-10" />
      
      <aside className="flex flex-col w-full max-w-[255px] h-full pb-6 bg-white border-r overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
        <div
          style={{
            height: `calc(${headerHeight}px + 1px)`,
          }}
          className="w-full px-6 py-4 bg-white border-b"
        >
          <p className="text-lg font-semibold text-neutral-900">Chats</p>
        </div>

        {dummyUsersData.map((user) => (
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
              <p className="font-semibold text-neutral-900">{user.full_name}</p>
              <p className="text-sm text-neutral-700">@{user.username}</p>
            </div>
          </NavLink>
        ))}
      </aside>

      <section className="flex flex-col w-full h-full overflow-hidden">
        <div
          ref={headerRef}
          className="flex justify-start w-full px-6 py-4 bg-white border-b"
        >
          <Link
            to={`/profile/${user._id}`}
            className="flex justify-start items-center gap-2"
          >
            <Avatar className="w-[50px] h-[50px] shrink-0 outline-2 outline-white">
              <AvatarImage src={user.profile_picture} />
              <AvatarFallback>
                {user.full_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col justify-between items-start gap-0 w-full">
              <p className="font-semibold text-neutral-900">{user.full_name}</p>
              <p className="text-sm text-neutral-700">@{user.username}</p>
            </div>
          </Link>
        </div>
      </section>
    </main>
  )
}

export default ChatBoxPage