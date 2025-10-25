import { Skeleton } from "../ui/skeleton";

const NotificationSkeleton = () => {
  return (
    <Skeleton className="flex justify-start items-stretch gap-3 w-full p-2">
      <Skeleton className="w-[60px] h-[60px] shrink-0 rounded-full bg-neutral-300" />
      <div className="flex flex-col justify-center items-start gap-2 w-full">
        <Skeleton className="w-[60%] h-5 rounded bg-neutral-300" />
        <Skeleton className="w-1/3 h-4 rounded bg-neutral-300" />
      </div>
    </Skeleton>
  )
}

export default NotificationSkeleton;