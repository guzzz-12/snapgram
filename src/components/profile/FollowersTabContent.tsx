import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import FollowerItem from "./FollowerItem";
import FollowerItemSkeleton from "./FollowerItemSkeleton";
import useIntersectionObserver from "@/hooks/useIntersectionObserver";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import type { FollowerType, UserType } from "@/types/global";

interface Props {
  userData: UserType | null;
}

const FollowersTabContent = ({ userData }: Props) => {
  const paginationRef = useRef<HTMLDivElement>(null);

  const {getToken} = useAuth();

  const getFollowers = async (page: number) => {
    const token = await getToken();

    const {data} = await axiosInstance<{
      data: FollowerType[];
      hasMore: boolean;
      nextPage: number | null;
    }>({
      method: "GET",
      url: `/follows/get-followers/${userData?._id}`,
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: {
        page,
        limit: 5
      }
    });

    return data
  }

  const {data, error, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} = useInfiniteQuery({
    queryKey: ["followers", userData?._id],
    queryFn: async ({pageParam}) => getFollowers(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
    refetchOnWindowFocus: false,
    enabled: !!userData
  });

  const {isIntersecting} = useIntersectionObserver({data, paginationRef});

  useEffect(() => {
    if (isIntersecting && hasNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage]);

  if (error) {
    toast.error(errorMessage(error));
  }

  const followers = data?.pages.flatMap(page => page.data) ?? [];

  return (
    <section className="flex flex-col w-full max-w-[600px] mx-auto">
      {!isLoading && followers.length === 0 &&
        <p className="text-center text-neutral-600 font-semibold">
          Aún no tienes seguidores.
        </p>
      }

      <ul className="flex flex-col gap-2 w-full">
        {isLoading &&
          Array(5).fill(0).map((_, i) => (
            <FollowerItemSkeleton key={i} />
          ))
        }

        {followers.map((follower) => (
          <FollowerItem
            key={follower._id}
            data={follower}
            userData={userData}
          />
        ))}

        {hasNextPage && !isFetchingNextPage &&
          <div ref={paginationRef} className="w-full h-10" />
        }
      </ul>
    </section>
  );
}

export default FollowersTabContent