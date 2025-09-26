export type UserType = {
  _id: string;
  clerkId: string;
  email: string;
  fullName: string;
  username: string;
  bio?: string;
  profilePicture?: string;
  coverPhoto?: string;
  location?: string;
  posts: PostType[];
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PostType = {
  _id: string;
  user: UserType;
  content: string;
  imageUrls?: string[];
  postType: "text_with_image" | "text" | "image";
  likesCount: string[];
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
  createdAt: string;
  updatedAt: string;
};

export type FollowingType = {
  _id: string;
  follower: string;
  followed: UserType;
  createdAt: Date;
  updatedAt: Date;
};

export type FollowingAndFollowersType = {
  following: UserType[];
  followers: UserType[];
}