import { Link } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NOTIFICATIONS_TEXT_MAP } from "@/utils/constants";
import type { NotificationEventData } from "@/types/socketTypes"
import { generateNotificationLink } from "@/utils/generateNotificationLink";

interface Props {
  notificationData: NotificationEventData;
}

const NotificationToast = ({ notificationData }: Props) => {
  const {notificationType: type, sender, onItem} = notificationData;

  const notificationLink = generateNotificationLink({type, onItem});

  return (
    <Link
      className="flex justify-start items-center gap-2 min-w-[270px] max-w-[300px] p-4 bg-neutral-200 rounded-md border shadow-md"
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
        <p className="text-sm text-neutral-900">
          {type === "like" && "A "}

          <span className="font-semibold">
            {sender.fullName}
          </span>

          {" "}

          <span className="font-normal">
            {NOTIFICATIONS_TEXT_MAP[type]}
          </span>
        </p>
      </div>
    </Link>
  )
}

export default NotificationToast