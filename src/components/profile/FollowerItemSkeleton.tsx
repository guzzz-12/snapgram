import { Skeleton } from "../ui/skeleton";

const FollowerItemSkeleton = () => {
  return (
    <div className="relative w-full h-[60px] rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden">
      <Skeleton className="w-full h-full bg-neutral-200 dark:bg-slate-800" />
      <Skeleton className="absolute top-1/2 right-4 w-[80px] h-[40px] -translate-y-1/2 bg-neutral-100 dark:bg-slate-700 z-10" />
    </div>
  )
}

export default FollowerItemSkeleton