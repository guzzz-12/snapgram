import type { PostType } from "@/dummy-data";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { AvatarImage } from "@radix-ui/react-avatar";
import dayjs from "dayjs";

interface Props {
  postData: PostType
};


const PostCardHeader = ({ postData }: Props) => {
  return (
    <div className="flex justify-start items-center gap-2 w-full">
      <Avatar className="outline-2 outline-blue-600 outline-offset-1">
        <AvatarImage src={postData.user.profile_picture} />
        <AvatarFallback>
          {postData.user.full_name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col justify-between items-start gap-0 w-full">
        <p className="font-semibold text-neutral-900">
          {postData.user.full_name}
        </p>
        <p
          className="text-xs text-neutral-700"
          title={dayjs(postData.updatedAt).format("DD/MM/YYYY - hh:mm A")}
        >
          {dayjs(postData.updatedAt).format("DD/MM/YYYY")}
        </p>
      </div>
    </div>
  )
}

export default PostCardHeader