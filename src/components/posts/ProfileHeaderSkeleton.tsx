import { Skeleton } from "../ui/skeleton";

const ProfileHeaderSkeleton = () => {
  return (
    <div className="block min-[850px]:grid grid-cols-1 grid-rows-5 w-full max-w-4xl mb-10 rounded-lg bg-white shadow overflow-hidden">
      {/* Banner skeleton */}
      <Skeleton className="w-full h-[180px] min-[850px]:h-[200px] col-span-1 row-span-2 rounded-none" />
      
      <div className="relative flex flex-col min-[850px]:flex-row w-full col-span-1 row-span-3">
        {/* Avatar skeleton */}
        <div className="absolute translate-y-[-50%] min-[850px]:static flex items-start shrink-0 pl-6 min-[850px]:translate-y-[0]">
          <Skeleton className="w-[120px] h-[120px] min-[850px]:w-[100px] min-[850px]:h-[100px] min-[950px]:w-[120px] min-[950px]:h-[120px] shrink-0 min-[850px]:translate-y-[-50%] outline-4 outline-white rounded-full" />
        </div>

        {/* Skeleton de los detalles del perfil */}
        <div className="w-full p-6 pt-[60px] min-[850px]:p-6 min-[850px]:pt-6">
          <div className="flex justify-between items-center mb-4">
            <div className="grow overflow-hidden space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="h-10 w-24 rounded-lg" />
          </div>

          <Skeleton className="h-4 w-full mb-4" />
          <Skeleton className="h-4 w-[90%] mb-4" />
          <Skeleton className="h-4 w-2/3 mb-4" />
          
          <div className="flex justify-start items-center gap-9">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>

          <div className="w-full h-px my-6 bg-gray-200" />

          {/* Skeleton del footer del perfil */}
          <div className="flex justify-center min-[500px]:justify-start gap-4 min-[500px]:gap-9">
            <div className="space-y-1">
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfileHeaderSkeleton