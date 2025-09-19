import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import DiscoverCard from "@/components/discover/DiscoverCard";
import SearchBar from "@/components/discover/SearchBar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { axiosInstance } from "@/utils/axiosInstance";
import { type FollowingType, type UserType } from "@/dummy-data";

const DiscoverPage = () => {
  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get("searchTerm");
  
  const [connections, setConnections] = useState<UserType[]>([]);
  const [following, setFollowing] = useState<FollowingType[]>([]);
  const [isSearching, setIsSearching] = useState(true);

  const search = async (keyword: string | null) => {
    try {
      setIsSearching(true);

      const {data: connectionsData} = await axiosInstance<{data: UserType[]}>({
        method: "GET",
        url: `/search/discover-users?term=${keyword || "all"}`
      });

      setConnections(connectionsData.data);
      
    } catch (error: any) {
      toast.error("Error buscando usuarios");

    } finally {
      setIsSearching(false);
    }
  }

  useEffect(() => {
    search(searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    axiosInstance<{data: FollowingType[]}>({
      method: "GET",
      url: "/users/following"
    })
    .then(({data}) => {
      setFollowing(data.data);
    })
    .catch((error: any) => {
      toast.error(error.message);
    });
  }, []);

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

        <SearchBar isSearching={isSearching} />

        <div className="grid grid-cols-1 min-[600px]:grid-cols-2 min-[768px]:grid-cols-1 min-[920px]:grid-cols-2 min-[1100px]:grid-cols-3 gap-4 w-full">
          {connections.map(connection => {
            return (
              <DiscoverCard
                key={connection._id}
                data={connection}
                following={following}
                setFollowing={setFollowing}
              />
            )
          })}
        </div>
      </section>
    </main>
  )
}

export default DiscoverPage