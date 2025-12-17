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
  getOnlineUsers: (data: {userId: string}) => void;
  typing: (data: TypingEventData) => void;
  stoppedTyping: (data: {userId: string, chatId: string}) => void;
  messageSeenBy: (data: {messageId: string, chatId: string, userId: string}) => void;
}

// Eventos de socket.io que el servidor envía
export interface ServerEvents {
  setOnlineUsers: (onlineUsers: OnlineUser[]) => void;
  newNotification: (notification: NotificationEventData) => void;
  newMessage: (newMessage: NewMessageEventData) => void;
  deletedMessage: (deletedMessage: MessageType) => void;
  typing: (data: TypingEventData) => void;
  stoppedTyping: (data: {userId: string, chatId: string}) => void;
  messageSeenBy: (data: {message: MessageType, chatId: string, userId: string}) => void;
  groupCreated: (data: ChatType) => void;
  groupUpdated: (data: ChatType) => void;
  groupDeleted: (groupId: string) => void;
  userLeftGroup: (data: ChatType) => void;
  userJoinedGroup: (data: ChatType) => void;
  editedMessage: (data: MessageType) => void;
  userBlocked: (data: {
    operation: "block" | "unblock";
    /** El usuario que realiza el bloqueo/desbloqueo */
    user: UserType;
    /** El usuario bloqueado/desbloqueado */
    blockedUser: UserType;
    /** El chat con el usuario bloqueado/desbloqueado (si existe) */
    chatId: string | null;
  }) => void;
}