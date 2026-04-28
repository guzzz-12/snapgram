import { faker } from "@faker-js/faker";
import { buildMockUser } from "../users/factories";
import type { PostType } from "@/types/global";

export const buildMockPost = (overrides?: Partial<PostType>): PostType => ({
  _id: faker.database.mongodbObjectId(),
  user: buildMockUser(),
  content: faker.lorem.paragraph(),
  imageUrls: [faker.image.url()],
  postType: faker.helpers.arrayElement(["textWithImage", "text", "image", "repost"]),
  changeLog: [],
  createdAt: faker.date.past().toISOString(),
  updatedAt: faker.date.recent().toISOString(),
  ...overrides,
});