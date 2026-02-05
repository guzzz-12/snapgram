import type { UserType } from "@/types/global"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import type { HTMLAttributes } from "react";
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
          <div
            key={el.user._id}
            className={cn("flex justify-start items-center gap-0")}
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
          </div>
        ))}

        {totalViewers > sliceLength && (
          <div className="flex justify-center items-center gap-0 min-w-[20px] h-[20px] ml-0.5 shrink-0">
            <span className="block px-1 text-xs text-neutral-300">
              +{totalViewers - sliceLength}
            </span>
          </div>
        )}
      </div>

      <p className="mt-1 text-center text-xs text-neutral-300 font-light">
        Vista por {totalViewers}
      </p>
    </div>
  )
}

export default SeenByUsers