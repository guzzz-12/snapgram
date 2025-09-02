import { useState } from "react";
import { Search } from "lucide-react";
import DiscoverCard from "@/components/DiscoverCard";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { dummyConnectionsData } from "@/dummy-data";

const DiscoverPage = () => {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <main className="pageWrapper">
      <SidebarTrigger className="absolute block md:hidden top-4 left-4 cursor-pointer z-10" />

      <section className="flex flex-col gap-6 w-full max-w-[800px]">
        <div className="">
          <h1 className="text-2xl font-semibold">
            Descubre
          </h1>

          <p className="text-sm text-neutral-700">
            Descubre personas de todo el mundo que compartan tus pasiones
          </p>
        </div>

        <search className="w-full p-4 bg-white rounded-md shadow border">
          <div className="relative">
            <Search className="absolute top-1/2 left-2 -translate-y-1/2 text-neutral-500" />

            <Input
              className="pl-10 bg-slate-100"
              type="search"
              placeholder="Buscar personas por nombre, ubicación o nombre de usuario"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </search>

        <div className="grid grid-cols-1 min-[600px]:grid-cols-2 min-[768px]:grid-cols-1 min-[920px]:grid-cols-2 min-[1100px]:grid-cols-3 gap-4 w-full">
          {dummyConnectionsData.map(connection => {
            return (
              <DiscoverCard key={connection._id} data={connection} />
            )
          })}
        </div>
      </section>
    </main>
  )
}

export default DiscoverPage