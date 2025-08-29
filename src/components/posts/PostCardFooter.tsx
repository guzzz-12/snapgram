import type { PostType } from "@/dummy-data"
import { Heart, MessageCircle, Share2 } from "lucide-react";

interface Props {
  postData: PostType;
}

const PostCardFooter = ({ postData }: Props) => {
  return (
    <div className="flex justify-start items-center gap-3 w-full">
      <div className="flex items-center gap-1 text-neutral-500">
        <Heart className="size-4" />
        <span className="text-sm font-semibold">
          {10}
        </span>
      </div>

      <div className="flex items-center gap-1 text-neutral-500">
        <MessageCircle className="size-4" />
        <span className="text-sm font-semibold">
          {21}
        </span>
      </div>

      <div className="flex items-center gap-1 text-neutral-500">
        <Share2 className="size-4" />
        <span className="text-sm font-semibold">
          {6}
        </span>
      </div>
    </div>
  )
}

export default PostCardFooter