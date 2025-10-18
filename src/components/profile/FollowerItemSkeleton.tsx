import { Skeleton } from "../ui/skeleton";

const FollowerItemSkeleton = () => {
  return (
    <div className="relative w-full h-[60px] rounded-md overflow-hidden">
      <Skeleton className="w-full h-full bg-white" />
      <Skeleton className="absolute top-1/2 right-4 w-[80px] h-[40px] -translate-y-1/2 bg-neutral-200 z-10" />
    </div>
  )
}

export default FollowerItemSkeleton