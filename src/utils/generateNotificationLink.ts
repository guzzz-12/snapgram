import type { Notifications } from "@/types/global";

interface Props {
  type: Notifications;
  onItemId: string;
}

/** Genera el link de la notificacion segun el tipo de notificacion */
export const generateNotificationLink = (props: Props) => {
  const { type, onItemId } = props;

  switch (type) {
    case "like":
    case "comment":
    case "reply":
    case "postShared":
      return `/post/${onItemId}`;
    case "follow":
      return `/profile/${onItemId}`;
  }
}