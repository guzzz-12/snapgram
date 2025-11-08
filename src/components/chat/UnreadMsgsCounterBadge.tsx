import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface Props {
  counter: {
    _id: string;
    user: string;
    count: number;
  } | undefined;
  className?: HTMLAttributes<HTMLElement>["className"];
}

const UnreadMsgsCounterBadge = ({counter, className}: Props) => {
  if (!counter || counter.count === 0) {
    return null;
  }

  return (
    <div className={cn("flex justify-center items-center min-w-[18px] h-[18px] p-1 bg-red-600 rounded-full shrink-0 outline-2 outline-white", className)}>
      <span className="text-xs font-semibold text-white">
        {counter.count > 99 ? "99+" : counter.count}
      </span>
    </div>
  )
}

export default UnreadMsgsCounterBadge