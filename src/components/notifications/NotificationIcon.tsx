import type { ComponentProps, HTMLAttributes } from "react";
import { FaCommentAlt, FaReply, FaHeart, FaUserPlus, FaShareAlt } from "react-icons/fa";
import { cn } from "@/lib/utils";
import type { Notifications } from "@/types/global";

interface Props {
  notificationType: Notifications;
  className?: HTMLAttributes<HTMLElement>["className"];
  props?: ComponentProps<"div">
}

const IconMap = {
  follow: FaUserPlus,
  like: FaHeart,
  comment: FaCommentAlt,
  reply: FaReply,
  postShared: FaShareAlt
}


const NotificationIcon = ({notificationType, className, ...props}: Props) => {
  const Icon = IconMap[notificationType];
  
  return (
    <div
      className={cn("flex justify-center items-center w-[20px] h-[20px] rounded-full outline-2 outline-white", className)}
      {...props}
    >
      <Icon className="w-[12px] h-[12px] fill-white" />
    </div>
  )
}

export default NotificationIcon