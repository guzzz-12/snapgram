import { faker } from "@faker-js/faker";
import type { FollowedType, FollowerType, UserType } from "@/types/global";

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

export const buildMockFollower = (
  overrides?: Partial<FollowerType["followerData"]> & { isFollowingBack?: boolean }
): FollowerType => {
  const { isFollowingBack = false, ...followerOverrides } = overrides ?? {};
  const user = buildMockUser();

  return {
    _id: faker.database.mongodbObjectId(),
    followerData: {
      _id: user._id,
      clerkId: user.clerkId,
      username: user.username,
      fullName: user.fullName,
      profilePicture: user.profilePicture,
      ...followerOverrides
    },
    isFollowingBack,
    followingSince: faker.date.past().toISOString()
  };
};

export const buildMockFollowed = (
  overrides?: Partial<FollowedType["followedData"]>
): FollowedType => {
  const user = buildMockUser();

  return {
    _id: faker.database.mongodbObjectId(),
    followedData: {
      _id: user._id,
      clerkId: user.clerkId,
      username: user.username,
      fullName: user.fullName,
      profilePicture: user.profilePicture,
      ...overrides
    },
    followingSince: faker.date.past().toISOString()
  };
};
