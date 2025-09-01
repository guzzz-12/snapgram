import ConnectionsTabs from "@/components/connections/ConnectionsTabs";
import ConnectionTypeItem from "@/components/connections/ConnectionTypeItem";
import RightSidebar from "@/components/RightSidebar";
import { SidebarTrigger } from "@/components/ui/sidebar";

const ConnectionsPage = () => {
  return (
    <main className="pageWrapper">
      <SidebarTrigger className="absolute block md:hidden top-4 left-4 cursor-pointer z-10" />

      <section className="flex flex-col gap-6 w-full">
        <div className="">
          <h1 className="text-2xl font-semibold">
            Conexiones
          </h1>

          <p className="text-sm text-neutral-700">
            Administra tu red de amigos y descubre nuevas conexiones
          </p>
        </div>

        <ul className="grid grid-cols-2 min-[600px]:grid-cols-4 min-[768px]:grid-cols-2 min-[900px]:grid-cols-4 gap-4 w-full max-w-[500px]">
          <ConnectionTypeItem count={2} title="Seguidores" />
          <ConnectionTypeItem count={2} title="Siguiendo" />
          <ConnectionTypeItem count={1} title="Pendientes" />
          <ConnectionTypeItem count={3} title="Conexiones" />
        </ul>

        <ConnectionsTabs />
      </section>

      <RightSidebar />
    </main>
  )
}

export default ConnectionsPage