import type { Comment, Notifications, PostType, StoryType, UserType } from "@/types/global";

interface Props {
  type: Notifications;
  onItem: UserType | PostType | Comment | StoryType | null;
}

/** Genera el link de la notificación segun el tipo de notificación */
export const generateNotificationLink = (props: Props) => {
  const { type, onItem } = props;

  if (!onItem) {
    return "";
  }

  const itemId = "clerkId" in onItem ? onItem.clerkId : onItem._id;

  const itemOwner = "user" in onItem;

  switch (type) {
    case "like":
    case "comment":
    case "reply":
    case "postShared":
      return `/post/${itemId}`;
    case "follow":
      return `/profile/${itemId}`;
    case "storyLiked":
      return `/stories/${itemOwner ? onItem.user.username : ""}?storyId=${itemId}`;
  }
}