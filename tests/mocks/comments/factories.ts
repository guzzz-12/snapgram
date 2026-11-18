import { faker } from "@faker-js/faker";
import { buildMockUser } from "../users/factories";
import type { Comment } from "@/types/global";

export const buildMockComment = (overrides?: Partial<Comment>): Comment => ({
  _id: faker.database.mongodbObjectId(),
  user: buildMockUser(),
  post: {
    _id: faker.database.mongodbObjectId(),
    userId: faker.database.mongodbObjectId()
  },
  parent: null,
  content: faker.lorem.sentence(),
  commentType: "text",
  mediaUrl: "",
  changeLog: [],
  repliesCount: 0,
  createdAt: faker.date.past().toISOString(),
  updatedAt: faker.date.recent().toISOString(),
  ...overrides
});
