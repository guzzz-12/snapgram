import { axiosInstance } from "@/utils/axiosInstance";
import type { FollowedType, FollowerType, PostWithLikes, UserType } from "@/types/global";

type GetUserProps = {
  /** La ID del usuario en Clerk */
  userClerkId: string | undefined;
  getToken: () => Promise<string | null>;
}

type FetchUserPostsProps = {
  page: number;
  /** La ID del usuario en la base de datos */
  userId: string | undefined;
  getToken: () => Promise<string | null>;
}

type FetchFollowersProps = {
  /** La ID del usuario en la base de datos */
  userId: string | undefined;
  page: number;
  getToken: () => Promise<string | null>;
}

/** Función para obtener el perfil de un usuario mediante su ID de Clerk */
export const fetchUserProfile = async ({userClerkId, getToken}: GetUserProps) => {
  const token = await getToken();

  const {data} = await axiosInstance<{data: UserType}>({
    method: "GET",
    url: `/users/${userClerkId}`,
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return data.data;
}

/** Función para obtener los posts de un usuario */
export const fetchUserPosts = async ({page, userId, getToken}: FetchUserPostsProps) => {
  const token = await getToken();
  
  const {data} = await axiosInstance<{
    data: PostWithLikes[];
    hasMore: boolean;
    nextPage: number | null;
  }>({
    method: "GET",
    url: `/posts/user/${userId}`,
    params: {
      page,
      limit: 5
    },
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return data;
}

/** Función para consultar los seguidores de un usuario */
export const fetchFollowers = async ({userId, page, getToken}: FetchFollowersProps) => {
  const token = await getToken();

  const {data} = await axiosInstance<{
    data: FollowerType[];
    hasMore: boolean;
    nextPage: number | null;
  }>({
    method: "GET",
    url: `/follows/get-followers/${userId}`,
    headers: {
      Authorization: `Bearer ${token}`
    },
    params: {
      page,
      limit: 5
    }
  });

  return data
}

/** Función para consultar los seguidos de un usuario */
export const fetchFollowing = async ({userId, page, getToken}: FetchFollowersProps) => {
  const token = await getToken();

  const {data} = await axiosInstance<{
    data: FollowedType[];
    hasMore: boolean;
    nextPage: number | null;
  }>({
    method: "GET",
    url: `/follows/get-following/${userId}`,
    headers: {
      Authorization: `Bearer ${token}`
    },
    params: {
      page,
      limit: 5
    }
  });

  return data
}

/** Función para obtener los posts a los que un usuario les ha dado like */
export const fetchUserLikedPosts = async (page: number, getToken: () => Promise<string | null>) => {
  const token = await getToken();

  const {data} = await axiosInstance<{
    data: PostWithLikes[];
    hasMore: boolean;
    nextPage: number | null;
  }>({
    method: "GET",
    url: "/likes/liked-posts",
    headers: {
      Authorization: `Bearer ${token}`
    },
    params: {
      page,
      limit: 10
    }
  });

  return data;
}