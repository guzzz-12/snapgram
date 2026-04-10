import { useEffect, useRef } from "react";
import { toast } from "sonner";
import FollowedItem from "./FollowedItem";
import FollowerItemSkeleton from "./FollowerItemSkeleton";
import { useGetFollowing } from "@/services/profile";
import useIntersectionObserver from "@/hooks/useIntersectionObserver";
import { errorMessage } from "@/utils/errorMessage";
import type { UserType } from "@/types/global";

interface Props {
  userData: UserType | null;
}

const FollowingTabContent = ({ userData }: Props) => {
  const paginationRef = useRef<HTMLDivElement>(null);

  const {
    data: following,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    error,
    fetchNextPage
  } = useGetFollowing(userData);

  const {isIntersecting} = useIntersectionObserver({data: following, paginationRef});

  useEffect(() => {
    if (isIntersecting && hasNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage]);

  if (error) {
    toast.error(errorMessage(error));
  }

  return (
    <section className="flex flex-col w-full max-w-[600px] mx-auto">
      {!isLoading && following.length === 0 &&
        <p className="text-center text-neutral-600 font-semibold">
          Aún no estás siguiendo a nadie.
        </p>
      }

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