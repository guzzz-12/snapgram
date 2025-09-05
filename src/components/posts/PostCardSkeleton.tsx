import { Skeleton } from "../ui/skeleton";

const PostCardSkeleton = () => {
  return (
    <div className="w-full mx-auto">
      <div className="flex flex-col space-y-3 rounded-lg border bg-white p-6 shadow-md">
        {/* Header del post */}
        <div className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-4 w-[100px]" />
          </div>
        </div>
        
        {/* Contenido de texto */}
        <div className="space-y-2 py-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[90%]" />
          <Skeleton className="h-4 w-[85%]" />
        </div>

        {/* Imagen del post */}
        <Skeleton className="w-full aspect-[4/3] rounded-lg" />
        
        {/* Footer */}
        <div className="flex items-center space-x-4 pt-4">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-4 w-8" />
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-4 w-8" />
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-4 w-8" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default PostCardSkeleton