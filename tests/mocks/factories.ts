import { faker } from "@faker-js/faker";
import type { UserType, PostType, NotificationType } from "../../src/types/global";

export const buildMockUser = (overrides?: Partial<UserType>): UserType => ({
  _id: faker.database.mongodbObjectId(),
  clerkId: faker.string.uuid(),
  email: faker.internet.email(),
  fullName: faker.person.fullName(),
  username: faker.internet.username(),
  bio: faker.person.bio(),
  profilePicture: faker.image.avatar(),
  coverPicture: faker.image.url(),
  location: faker.location.city(),
  postsCount: faker.number.int({ min: 0, max: 100 }),
  followersCount: faker.number.int({ min: 0, max: 1000 }),
  followingCount: faker.number.int({ min: 0, max: 500 }),
  isFollowing: faker.datatype.boolean(),
  isFollowedBy: faker.datatype.boolean(),
  isDisabled: false,
  isVerified: faker.datatype.boolean(),
  hasCryptoKeys: true,
  createdAt: faker.date.past().toISOString(),
  updatedAt: faker.date.recent().toISOString(),
  ...overrides,
});

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