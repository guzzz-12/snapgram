import { Link } from "react-router";
import { Eye, MessageSquare } from "lucide-react";
import RightSidebar from "@/components/RightSidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { dummyConnectionsData } from "@/dummy-data";

const MessagesPage = () => {
  return (
    <main className="pageWrapper">
      <SidebarTrigger className="absolute block md:hidden top-4 left-4 cursor-pointer z-10" />

      <section className="w-full">
        <h1 className="text-2xl font-semibold">
          Mensajes
        </h1>

        <p className="text-sm text-neutral-700">
          Habla con tu familia y amigos
        </p>

        <div className="flex flex-col gap-4 mt-6">
          {dummyConnectionsData.map(connection => {
            return (
              <article
                key={connection._id}
                className="flex gap-3 w-full max-w-[480px] p-4 bg-white rounded-md shadow"
              >
                <div className="flex items-start shrink-0 h-full">
                  <Avatar>
                    <AvatarImage src={connection.profile_picture} />
                    <AvatarFallback>
                      {connection.full_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <div className="flex flex-col w-full overflow-hidden">
                  <p className="text-sm text-left font-semibold truncate">
                    {connection.full_name}
                  </p>

                  <p className="mb-2 text-xs text-left text-neutral-700 truncate">
                    @{connection.username}
                  </p>

                  <p className="text-xs text-left text-neutral-700 line-clamp-2">
                    {connection.bio}
                  </p>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <Link
                    to={`/messages/${connection._id}`}
                    className="flex items-center justify-center w-9 h-9 p-2 bg-slate-300 hover:bg-slate-200 rounded-sm focus-visible:outline-neutral-700 cursor-pointer"
                  >
                    <MessageSquare
                      className="size-4 text-neutral-900 stroke-2"
                      aria-hidden
                    />

                    <span className="sr-only">
                      Enviar mensaje
                    </span>
                  </Link>

                  <button
                    className="flex items-center justify-center w-9 h-9 p-2 bg-slate-300 hover:bg-slate-200 rounded-sm focus-visible:outline-neutral-700 cursor-pointer"
                  >
                    <Eye
                      className="size-4 text-neutral-900 stroke-2"
                      aria-hidden
                    />

                    <span className="sr-only">
                      Ver perfil
                    </span>
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <RightSidebar />
    </main>
  )
}

export default MessagesPage