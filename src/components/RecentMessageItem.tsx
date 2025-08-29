import { Link } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import dayJsInstance from "@/utils/dayJsInstance";
import type { RecentMessageType } from "@/dummy-data";

interface Props {
  messageData: RecentMessageType;
}

const RecentMessageItem = ({ messageData }: Props) => {
  return (
    <Link
      to={`/messages/${messageData._id}`}
      className="flex justify-start items-center gap-2 w-full p-1 rounded-sm hover:bg-neutral-100 transition-colors"
    >
      <Avatar className="shrink-0 border-2 border-blue-600">
        <AvatarImage src={messageData.from_user_id.profile_picture} />
        <AvatarFallback>
          {messageData.from_user_id.full_name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col justify-between items-start gap-0 w-full overflow-hidden">
        <p className="w-full text-sm font-semibold text-neutral-700 truncate">
          {messageData.from_user_id.full_name}
        </p>

        {messageData.message_type === "text" &&
          <p className="text-xs text-neutral-700 line-clamp-2 leading-tight">
            {messageData.text}
          </p>
        }
      </div>

      <p className="mb-auto shrink-0 text-xs text-neutral-700 truncate">
        {dayJsInstance.duration(messageData.updatedAt).humanize(true).charAt(0).toUpperCase() + dayJsInstance.duration(messageData.updatedAt).humanize(true).slice(1)}
      </p>
    </Link>
  )
}

export default RecentMessageItem