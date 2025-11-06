import type { ChatType, MessageType, UserType } from "./global";

export type OnlineUser = {
  clerkUserId: string;
  socketId: string;
}

export type NotificationEventData = {
  _id: string;
  notificationType: "follow" | "like" | "comment" | "reply";
  originalPostId: string | null;
  recipientId: string;
  sender: {
    _id: string;
    clerkId: string;
    fullName: string;
    username: string;
    profilePicture: string;
  };
}

export type NewMessageEventData = {
  message: MessageType;
  chat: ChatType;
  isNewChat: boolean;
}

// Eventos de socket.io que el cliente envía
export interface ClientEvents {
  getOnlineUsers: ({userId}: {userId: string}) => void;
}

// Eventos de socket.io que el servidor envía
export interface ServerEvents {
  setOnlineUsers: (onlineUsers: OnlineUser[]) => void;
  newNotification: (notification: NotificationEventData) => void;
  newPrivateMessage: (newMessage: NewMessageEventData) => void;
  deletedMessage: (deletedMessage: MessageType) => void;
}