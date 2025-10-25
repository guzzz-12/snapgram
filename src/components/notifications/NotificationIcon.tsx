import type { ComponentProps, HTMLAttributes } from "react";
import { FaCommentAlt, FaReply, FaHeart, FaUserPlus } from "react-icons/fa";
import { cn } from "@/lib/utils";

interface Props {
  notificationType: "follow" | "like" | "comment" | "reply";
  className?: HTMLAttributes<HTMLElement>["className"];
  props?: ComponentProps<"div">
}

const IconMap = {
  follow: FaUserPlus,
  like: FaHeart,
  comment: FaCommentAlt,
  reply: FaReply,
}


const NotificationIcon = ({notificationType, className, ...props}: Props) => {
  const Icon = IconMap[notificationType];
  
  return (
    <div
      className={cn("flex justify-center items-center w-[24px] h-[24px] rounded-full outline-2 outline-white", className)}
      {...props}
    >
      <Icon className="w-[14px] h-[14px] fill-white" />
    </div>
  )
}

export default NotificationIcon