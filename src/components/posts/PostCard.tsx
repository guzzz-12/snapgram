import PostHeader from "./PostCardHeader";
import PostCardFooter from "./PostCardFooter";
import { Separator } from "../ui/separator";
import type { PostType } from "@/dummy-data";

interface Props {
  postData: PostType;
}

const PostCard = ({ postData }: Props) => {
  return (
    <article className="flex flex-col gap-2 w-full p-4 rounded-lg bg-white shadow">
      <PostHeader postData={postData} />

      {postData.content && (
        <p className="text-base text-neutral-700">
          {postData.content}
        </p>
      )}

      {postData.image_urls.length > 0 && (
        <div className="relative w-full aspect-[4/3] rounded-lg bg-neutral-200 overflow-hidden">
          <div
            style={{
              filter: "blur(15px)",
              backgroundImage: `url(${postData.image_urls[0]})`
            }}
            className="absolute top-0 left-0 w-full h-full opacity-70 bg-cover bg-center bg-no-repeat z-0"
          />
          <img
            className="relative w-full h-full object-contain z-30"
            src={postData.image_urls[0]}
            alt={`Post de ${postData.user.full_name}`}
          />
        </div>
      )}

      <Separator className="w-full" />

      <PostCardFooter postData={postData} />
    </article>
  )
}

export default PostCard