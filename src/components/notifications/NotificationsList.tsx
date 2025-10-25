import NotificationItem from "./NotificationItem";
import NotificationSkeleton from "./NotificationSkeleton";
import type { NotificationType } from "@/types/global";

interface Props {
  notifications: NotificationType[];
  loading: boolean;
  isFetchingNextPage: boolean;
}

const NotificationsList = ({ notifications, loading, isFetchingNextPage }: Props) => {
  return (
    <ul className="flex flex-col items-start gap-3 w-full">
      {loading && 
        <>
          <NotificationSkeleton />
          <NotificationSkeleton />
          <NotificationSkeleton />
          <NotificationSkeleton />
          <NotificationSkeleton />
          <NotificationSkeleton />
        </>
      }

      {notifications.map((notification) => {
        return (
          <li key={notification._id} className="w-full">
            <NotificationItem data={notification} />
          </li>
        )
      })}

      {isFetchingNextPage && 
        <>
          <NotificationSkeleton />
          <NotificationSkeleton />
          <NotificationSkeleton />
          <NotificationSkeleton />
          <NotificationSkeleton />
          <NotificationSkeleton />
        </>
      }
    </ul>
  )
}

export default NotificationsList