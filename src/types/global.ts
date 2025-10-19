export type UserType = {
  _id: string;
  clerkId: string;
  email: string;
  fullName: string;
  username: string;
  bio: string;
  profilePicture: string;
  coverPhoto: string;
  location: string;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export type LikeType = {
  _id: string;
  user: {
    _id: string;
    clerkId: string;
    fullName: string;
    profilePicture: string;
    username: string;
  },
  post: {
    _id: string;
  },
  comment: {
    _id: string;
  }
}

export type ChangeLogType = {
  _id: string;
  previousContent: string;
  editedAt: string;
}

export type PostType = {
  _id: string;
  user: UserType;
  content: string;
  imageUrls: string[];
  postType: "textWithImage" | "text" | "image";
  changeLog: ChangeLogType[];
  createdAt: string;
  updatedAt: string;
}

export type PostWithLikes = {
  _id: string;
  user: {
    _id: string;
    clerkId: string;
    fullName: string;
    username: string;
    profilePicture: string;
  };
  content: string;
  imageUrls: string[];
  postType: "textWithImage" | "text" | "image";
  likes: LikeType[];
  isLiked: boolean;
  likesCount: number;
  commentsCount: number;
  changeLog: ChangeLogType[];
  createdAt: string;
  updatedAt: string;
}

export type MessageType = {
  _id: string;
  fromUserId: string;
  toUserId: string;
  text?: string;
  messageType: "text" | "image" | "video";
  mediaUrl?: string;
  createdAt: string;
  updatedAt: string;
  seen: boolean;
}

export type StoryType = {
  _id: string;
  user: UserType;
  content: string;
  textColor: string;
  textBgColor: string;
  mediaUrl: string;
  mediaType: "text" | "image" | "video";
  backgroundColor: string;
  imageSize: "cover" | "contain";
  createdAt: string;
  updatedAt: string;
};

export type FollowerType = {
  _id: string;
  followerData: {
    _id: string;
    clerkId: string;
    username: string;
    fullName: string;
    profilePicture: string;
  },
  isFollowingBack: boolean;
  followingSince: string;
};

export type FollowedType = {
  _id: string;
  followedData: {
    _id: string;
    clerkId: string;
    username: string;
    fullName: string;
    profilePicture: string;
  },
  followingSince: string;
};

export type UserWithStories = {
  _id: string;
  clerkId: string;
  fullName: string;
  username: string;
  profilePicture?: string;
  stories: StoryType[];
}

export type Comment = {
  _id: string;
  user: UserType;
  post: PostType;
  parent: Comment | null;
  content: string;
  commentType: "text" | "image" | "video";
  mediaUrl: string;
  changeLog: ChangeLogType[];
  repliesCount: number;
  createdAt: string;
  updatedAt: string;
}

export type SearchUsersResult = {
  _id: string;
  bio: string;
  clerkId: string;
  createdAt: string;
  followersCount: number;
  followingCount: number;
  fullName: string;
  isFollowing: boolean;
  isVerified: boolean;
  location: string;
  profilePicture: string;
  username: string;
};