import type { HTMLAttributes } from "react";
import { Link } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { UserType } from "@/types/global";
import { cn } from "@/lib/utils";

interface Props {
  data: {
    user: UserType;
    seenAt: string;
  }[];
  className?: HTMLAttributes<HTMLElement>["className"];
}

const SeenByUsers = ({ data, className }: Props) => {
  const totalViewers = data.length;
  const sliceLength = 10;

  if (!totalViewers) return null;

  return (
    <div className={cn("flex flex-col justify-center items-center", className)}>
      <div className="flex justify-center items-center gap-0">
        {data.slice(0, sliceLength).map((el, i) => (
          <Link
            key={el.user._id}
            className={cn("flex justify-start items-center gap-0")}
            to={`/profile/${el.user.clerkId}`}
          >
            <Avatar className="w-[24px] h-[24px] shrink-0">
              <AvatarImage
                className="w-full h-full object-cover"
                src={el.user.profilePicture}
              />
              <AvatarFallback className="w-full h-full object-cover">
                {el.user.fullName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
        ))}

        {totalViewers > sliceLength && (
          <div className="flex justify-center items-center gap-0 min-w-[20px] h-[20px] ml-0.5 shrink-0">
            <span className="block px-1 text-[10px] text-neutral-300">
              +{totalViewers - sliceLength}
            </span>
          </div>
        )}
      </div>

      <p className="mt-1 text-center text-[10px] text-neutral-300 font-light">
        Vista por {totalViewers}
      </p>
    </div>
  )
}

export default SeenByUsers