import { Skeleton } from "../ui/skeleton";
import { cn } from "@/lib/utils";

interface Props {
  commentWidth: `w-[${number}px]` | `w-full` | `w-[${number}%]`;
  commentHeight: `h-[${number}px]`;
}

const CommentSkeleton = ({ commentWidth, commentHeight }: Props) => {
  return (
    <div className="flex gap-3 w-full">
      <Skeleton className="w-8 h-8 shrink-0 rounded-full bg-neutral-300" />
      <Skeleton className={cn("rounded-lg bg-neutral-300", commentWidth, commentHeight)} />
    </div>
  )
}

export default CommentSkeleton