import { faker } from "@faker-js/faker";
import type { UserType } from "@/types/global";

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