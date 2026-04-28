import { faker } from "@faker-js/faker";
import { buildMockPost } from "../posts/factories";
import { buildMockUser } from "../users/factories";
import type { NotificationType } from "@/types/global";

export const buildMockNotification = (overrides?: Partial<NotificationType>): NotificationType => {
  const notificationType = faker.helpers.arrayElement(["follow", "like", "comment", "reply", "postShared", "storyLiked"]);

  const onModel = faker.helpers.arrayElement(["User", "Post", "Comment", "Story"]);

  return {
    _id: faker.database.mongodbObjectId(),
    sender: buildMockUser(),
    recipient: faker.database.mongodbObjectId(),
    notificationType,
    onModel,
    onItem: onModel === "User" ? buildMockUser() : buildMockPost(),
    originalPost: notificationType === "reply" ? buildMockPost() : null,
    isSeen: faker.datatype.boolean(),
    isRead: faker.datatype.boolean(),
    createdAt: faker.date.recent({ days: 30 }).toISOString(),
    updatedAt: faker.date.recent({ days: 10 }).toISOString(),
    ...overrides,
  };
};