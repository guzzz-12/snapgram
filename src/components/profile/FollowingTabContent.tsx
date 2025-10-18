import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import FollowedItem from "./FollowedItem";
import FollowerItemSkeleton from "./FollowerItemSkeleton";
import useIntersectionObserver from "@/hooks/useIntersectionObserver";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import type { FollowedType } from "@/types/global";
import type { UserType } from "@/types/global";

interface Props {
  userData: UserType | null;
}

const FollowingTabContent = ({ userData }: Props) => {
  const paginationRef = useRef<HTMLDivElement>(null);

  const {getToken} = useAuth();

  const getFollowing = async (page: number) => {
    const token = await getToken();

    const {data} = await axiosInstance<{
      data: FollowedType[];
      hasMore: boolean;
      nextPage: number | null;
    }>({
      method: "GET",
      url: `/follows/get-following/${userData?._id}`,
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
    queryKey: ["following", userData?._id],
    queryFn: async ({pageParam}) => getFollowing(pageParam),
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

  const following = data?.pages.flatMap(page => page.data) ?? [];

  return (
    <section className="flex flex-col gap-6 w-full max-w-[600px] mx-auto">
      <ul className="flex flex-col gap-2 w-full">
        {isLoading &&
          Array(5).fill(0).map((_, i) => (
            <FollowerItemSkeleton key={i} />
          ))
        }

        {following.map((follower) => (
          <FollowedItem
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

export default FollowingTabContent