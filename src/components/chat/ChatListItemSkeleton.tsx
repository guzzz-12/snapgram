import { Skeleton } from "../ui/skeleton"

const ChatListItemSkeleton = () => {
  return (
    <Skeleton className="flex justify-start items-center gap-2 w-full p-2 bg-neutral-300">
      <Skeleton className="w-[40px] h-[40px] shrink-0 rounded-full bg-neutral-100" />
      <div className="flex flex-col justify-center items-start gap-2 w-full">
        <Skeleton className="w-[80%] h-4 rounded bg-neutral-100" />
        <Skeleton className="w-1/3 h-3 rounded bg-neutral-100" />
      </div>
    </Skeleton>
  )
}

export default ChatListItemSkeleton