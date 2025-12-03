import type { ChatType, MessageType, Notifications, UserType } from "./global";

export type OnlineUser = {
  clerkUserId: string;
  socketId: string;
}

export type NotificationEventData = {
  _id: string;
  notificationType: Notifications;
  originalPostId: string | null;
  recipientId: string;
  onItemId: string;
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

export type TypingEventData = {
  user: Pick<UserType, "_id" | "fullName" | "username" | "profilePicture">;
  chatId: string;
}

// Eventos de socket.io que el cliente envía
export interface ClientEvents {
  getOnlineUsers: ({userId}: {userId: string}) => void;
  typing: (data: TypingEventData) => void;
  stoppedTyping: ({chatId, userId}: {userId: string, chatId: string}) => void;
}

// Eventos de socket.io que el servidor envía
export interface ServerEvents {
  setOnlineUsers: (onlineUsers: OnlineUser[]) => void;
  newNotification: (notification: NotificationEventData) => void;
  newMessage: (newMessage: NewMessageEventData) => void;
  deletedMessage: (deletedMessage: MessageType) => void;
  typing: (data: TypingEventData) => void;
  stoppedTyping: ({chatId, userId}: {userId: string, chatId: string}) => void;
  groupCreated: (data: ChatType) => void;
  groupUpdated: (data: ChatType) => void;
  groupDeleted: (groupId: string) => void;
  userLeftGroup: (data: ChatType) => void;
  userJoinedGroup: (data: ChatType) => void;
  userBlocked: (data: {
    operation: "block" | "unblock";
    /** El usuario que realiza el bloqueo/desbloqueo */
    user: UserType;
    /** El usuario bloqueado/desbloqueado */
    blockedUser: UserType;
  }) => void;
}