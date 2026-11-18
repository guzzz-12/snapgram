import { faker } from "@faker-js/faker";
import { buildMockUser } from "../users/factories";
import type { PostType, PostWithLikes } from "@/types/global";

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

export const buildMockPostWithLikes = (
  overrides?: Partial<PostWithLikes>
): PostWithLikes => {
  const author = buildMockUser();

  return {
    _id: faker.database.mongodbObjectId(),
    user: {
      _id: author._id,
      clerkId: author.clerkId,
      fullName: author.fullName,
      username: author.username,
      profilePicture: author.profilePicture
    },
    content: faker.lorem.paragraph(),
    imageUrls: [faker.image.url()],
    postType: faker.helpers.arrayElement(["textWithImage", "text", "image"]),
    originalPost: null,
    likes: [],
    isLiked: false,
    likesCount: 0,
    commentsCount: 0,
    sharedCount: 0,
    changeLog: [],
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    ...overrides
  };
};