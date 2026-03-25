import type { Comment, Notifications, PostType, StoryType, UserType } from "@/types/global";

interface Props {
  type: Notifications;
  onItem: UserType | PostType | Comment | StoryType | null;
  originalPost: PostType | null;
}

/** Genera el link de la notificación segun el tipo de notificación */
export const generateNotificationLink = (props: Props) => {
  const { type, onItem, originalPost } = props;

  const itemId = (onItem && "clerkId" in onItem) ? onItem.clerkId : originalPost ? originalPost._id : onItem?._id;

  const itemOwner = onItem && "user" in onItem;

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