import { faker } from "@faker-js/faker";
import { buildMockUser } from "../users/factories";
import type { ChatType, MessageType } from "@/types/global";
import type { NewMessageEventData } from "@/types/socketTypes";

export const buildMockMessage = (overrides?: Partial<MessageType>): MessageType => ({
  _id: faker.database.mongodbObjectId(),
  chat: faker.database.mongodbObjectId(),
  sender: buildMockUser(),
  text: faker.lorem.sentence(),
  fileUrls: null,
  fileIds: [],
  seenBy: [],
  deletedFor: [],
  deletedForAll: false,
  type: "text",
  userWhoLeft: null,
  kickedBy: null,
  kickedUser: null,
  addedBy: null,
  addedUser: null,
  cryptoKeys: [],
  initVector: "",
  history: null,
  createdAt: faker.date.past().toISOString(),
  updatedAt: faker.date.recent().toISOString(),
  ...overrides
});

export const buildMockChat = (overrides?: Partial<ChatType>): ChatType => {
  const participants = overrides?.participants ?? [buildMockUser(), buildMockUser()];
  const isGroup = overrides?.type === "group";

  return {
    _id: faker.database.mongodbObjectId(),
    type: "private",
    participants,
    groupName: isGroup ? faker.company.name() : null,
    groupAdmin: isGroup ? participants[0] : null,
    groupPicture: isGroup ? faker.image.url() : null,
    groupDescription: isGroup ? faker.lorem.sentence() : null,
    lastMessage: null,
    unseenMessages: [],
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    ...overrides
  };
};

export const buildMockNewMessageEvent = (
  overrides?: Partial<NewMessageEventData>
): NewMessageEventData => {
  const chat = overrides?.chat ?? buildMockChat();
  const message =
    overrides?.message ??
    buildMockMessage({
      chat: chat._id,
      sender: chat.participants[0]
    });

  return {
    message,
    chat: {
      ...chat,
      lastMessage: message
    },
    isNewChat: false,
    ...overrides
  };
};
