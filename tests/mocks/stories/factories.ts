import { faker } from "@faker-js/faker";
import type { StoryType, UserWithStories } from "@/types/global";
import { buildMockUser } from "../users/factories";

export const buildMockStory = (overrides?: Partial<StoryType>): StoryType => ({
  _id: faker.database.mongodbObjectId(),
  user: buildMockUser(),
  content: faker.lorem.sentence(),
  textColor: "#fff",
  textBgColor: "transparent",
  mediaUrl: "",
  mediaType: "text",
  backgroundColor: "#1d4ed8",
  imageSize: "cover",
  seenBy: [],
  likedBy: [],
  createdAt: faker.date.recent().toISOString(),
  updatedAt: faker.date.recent().toISOString(),
  ...overrides
});

export const buildMockUserWithStories = (
  overrides?: Partial<UserWithStories>
): UserWithStories => {
  const user = buildMockUser();

  return {
    _id: user._id,
    clerkId: user.clerkId,
    fullName: user.fullName,
    username: user.username,
    profilePicture: user.profilePicture,
    stories: [buildMockStory({ user })],
    ...overrides
  };
};
