import { useEffect, useRef } from "react";
import { toast } from "sonner";
import FollowerItem from "./FollowerItem";
import FollowerItemSkeleton from "./FollowerItemSkeleton";
import { useProfileService } from "@/services/profileService";
import useIntersectionObserver from "@/hooks/useIntersectionObserver";
import { errorMessage } from "@/utils/errorMessage";
import type { UserType } from "@/types/global";

interface Props {
  userData: UserType | null;
}

const FollowersTabContent = ({ userData }: Props) => {
  const paginationRef = useRef<HTMLDivElement>(null);

  const {getFollowers} = useProfileService();

  const {data: followers, isLoading, hasNextPage, isFetchingNextPage, error, fetchNextPage} = getFollowers(userData);

  const {isIntersecting} = useIntersectionObserver({data: followers, paginationRef});

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