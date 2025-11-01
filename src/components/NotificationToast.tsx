import { Link } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { NotificationEventData } from "@/types/socketTypes"

interface Props {
  notificationData: NotificationEventData;
}

const NotificationToast = ({ notificationData }: Props) => {
  const {notificationType: type, sender} = notificationData;

  const notificationLink = type === "follow" ? `/profile/${sender.clerkId}` : `/post/${notificationData?.originalPostId}`

  return (
    <Link
      className="flex justify-start items-center gap-2 min-w-[270px] max-w-[300px] p-4 bg-[#4F39F6] rounded-md border shadow-md"
      to={notificationLink}
    >
      <div className="flex items-center h-full shrink-0">
        <Avatar className="w-[45px] h-[45px] shrink-0">
          <AvatarImage
            className="w-full h-full object-cover object-center"
            src={sender.profilePicture}
          />
          <AvatarFallback className="w-full h-full object-cover object-center">
            {sender.fullName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>

      <div className="w-full h-full overflow-hidden">
        <p className="text-sm text-neutral-50">
          <span className="font-semibold">{sender.fullName}</span>
          &nbsp;
          {type === "follow" && "te comenzó a seguir."}
          {type === "like" && "le gustó tu publicación."}
          {type === "comment" && "comentó tu publicación."}
          {type === "reply" && "respondió a tu comentario en una publicación."}
        </p>
      </div>
    </Link>
  )
}

export default NotificationToast