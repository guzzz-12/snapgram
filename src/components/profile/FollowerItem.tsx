import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/utils/errorMessage";
import { axiosInstance } from "@/utils/axiosInstance";
import type { FollowerType, UserType } from "@/types/global";
import { cn } from "@/lib/utils";

interface Props {
  data: FollowerType;
  userData: UserType | null;
}

const FollowerItem = ({ data, userData }: Props) => {
  const {followerData: {_id: followerId, clerkId: followerClerkId, fullName, username, profilePicture}, isFollowingBack} = data;
  
  const followBtnRef = useRef<HTMLButtonElement>(null);

  const {getToken, userId: currentUserClerkId} = useAuth();

  const queryClient = useQueryClient();

  const {mutate, isPending} = useMutation({
    mutationFn: async () => {
      const token = await getToken();

      return axiosInstance({
        method: "POST",
        url: `/follows/follow-or-unfollow`,
        data: {
          userId: followerId
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({queryKey: ["followers", userData?._id]});
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    }
  });

  // Cambiar dinámicamente el texto del botón de seguir/dejar de seguir
  useEffect(() => {
    const onMouseEnterHandler = () => {
      followBtnRef.current!.textContent = "Dejar de seguir";
    }

    const onMouseLeaveHandler = () => {
      followBtnRef.current!.textContent = "Siguiendo";
    }

    if (isFollowingBack) {
      followBtnRef.current!.addEventListener("mouseenter", onMouseEnterHandler);
      followBtnRef.current!.addEventListener("mouseleave", onMouseLeaveHandler);
    }

    return () => {
      if (followBtnRef.current) {
        followBtnRef.current.removeEventListener("mouseenter", onMouseEnterHandler);
        followBtnRef.current.removeEventListener("mouseleave", onMouseLeaveHandler);
      }
    }
  }, [isFollowingBack]);

  return (
    <li className="flex justify-start items-center gap-2 w-full border rounded-md p-2 bg-white shadow">
      <Link
        className="flex justify-start items-center gap-2 w-full"
        to={`/profile/${followerClerkId}`}
      >
        <div className="flex items-start shrink-0">
          <Avatar className="w-10 h-10">
            <AvatarImage src={profilePicture} />
            <AvatarFallback>
              {fullName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="flex flex-col justify-start items-start w-full grow overflow-hidden">
          <p className="text-base text-neutral-900 font-semibold truncate">
            {fullName}
          </p>
          <span className="text-sm text-neutral-700 truncate">
            @{username}
          </span>
        </div>
      </Link>

      {followerClerkId !== currentUserClerkId &&
        <Button
          ref={followBtnRef}
          className={cn("text-current cursor-pointer transition-none", isFollowingBack && "hover:text-destructive hover:border-destructive hover:bg-destructive/5")}
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => mutate()}
        >
          {isFollowingBack ? "Siguiendo" : "Seguir"}
        </Button>
      }
    </li>
  );
}

export default FollowerItem