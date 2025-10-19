import { Skeleton } from "@/components/ui/skeleton";

const SearchUserCardSkeleton = () => {
  return (
    <div className="flex flex-col w-full p-5 border rounded-md bg-white">
      <div className="flex flex-col items-center w-full overflow-hidden">
        {/* Avatar Skeleton */}
        <Skeleton className="w-[50px] h-[50px] mb-2 rounded-full" />
        
        {/* Full Name Skeleton */}
        <Skeleton className="w-2/3 h-6 mb-1 rounded" />
        
        {/* Username Skeleton */}
        <Skeleton className="w-1/2 h-4 mb-2 rounded" />
      </div>

      {/* Separator Skeleton */}
      <Skeleton className="w-full h-px my-3" />

      {/* Bio Skeleton */}
      <div className="w-full mb-4">
        <Skeleton className="w-full h-4 mb-1 rounded" />
        <Skeleton className="w-11/12 h-4 mb-1 rounded" />
        <Skeleton className="w-10/12 h-4 mb-1 rounded" />
        <Skeleton className="w-3/4 h-4 rounded" />
      </div>

      {/* Badges Skeleton */}
      <div className="flex justify-center items-center gap-2 w-full mb-4">
        <Skeleton className="basis-1/2 h-6 rounded-full" />
        <Skeleton className="basis-1/2 h-6 rounded-full" />
      </div>

      {/* Buttons Skeleton */}
      <div className="flex justify-start items-center gap-2 w-full">
        <Skeleton className="grow h-8 rounded" />
        <Skeleton className="shrink-0 h-8 w-8 rounded-full" />
      </div>
    </div>
  );
}

export default SearchUserCardSkeleton