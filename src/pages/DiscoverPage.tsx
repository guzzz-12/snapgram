import { useSearchParams } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import DiscoverCard from "@/components/discover/DiscoverCard";
import SearchBar from "@/components/discover/SearchBar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import ConnectionCardSkeleton from "@/components/connections/ConnectionCardSkeleton";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import type { FollowingType, UserType } from "@/types/global";

const DiscoverPage = () => {
  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get("searchTerm");

  const { getToken } = useAuth();

  const search = async (page: number, keyword: string | null | undefined) => {
    const token = await getToken();

    const {data} = await axiosInstance<{
      data: UserType[];
      hasMore: boolean;
      nextPage: number | null;
    }>({
      method: "GET",
      url: "/search/discover-users",
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: {
        page,
        keyword: keyword || "all",
        limit: 10
      }
    });

    return data;
  }

  const getFollowing = async () => {
    const token = await getToken();

    const {data} = await axiosInstance<{data: FollowingType[]}>({
      method: "GET",
      url: "/users/following",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return data;
  }

  const {data: searchData, error: searchError, fetchNextPage, isFetching, isFetchingNextPage} = useInfiniteQuery({
    queryKey: ["discover", searchTerm],
    queryFn: ({pageParam}) => search(pageParam, searchTerm),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
    refetchOnWindowFocus: false
  });

  const {data: following, isPending: loadingFollowing, error: followingError} = useQuery({
    queryKey: ["following"],
    queryFn: getFollowing,
    enabled: !!searchData?.pages.length,
    refetchOnWindowFocus: false
  });

  if (searchError) toast.error(errorMessage(searchError));
  if (followingError) toast.error(errorMessage(followingError));

  const isSearching = isFetching || isFetchingNextPage;
  const connections = searchData?.pages.flatMap(page => page.data) || [];

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

        <SearchBar loading={isSearching} />

        <div className="grid grid-cols-1 min-[600px]:grid-cols-2 min-[768px]:grid-cols-1 min-[920px]:grid-cols-2 min-[1100px]:grid-cols-3 gap-4 w-full">
          {isSearching && [...Array(6)].map((_, index) => <ConnectionCardSkeleton key={index} />)}

          {!isSearching && connections.length > 0 && connections.map(connection => {
            return (
              <DiscoverCard
                key={connection._id}
                data={connection}
                following={following?.data || []}
                loading={loadingFollowing}
              />
            )
          })}
        </div>
      </section>
    </main>
  )
}

export default DiscoverPage