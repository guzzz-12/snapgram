import { axiosInstance } from "@/utils/axiosInstance";
import type { Comment, PostWithLikes } from "@/types/global";

/** Función para obtener un post mediante su ID */
export const getPost = async ({getToken, postId}: {postId: string | undefined; getToken: () => Promise<string | null>}) => {
  const token = await getToken();

  if (!token || !postId) return false;

  const {data} = await axiosInstance<{data: PostWithLikes}>({
    method: "GET",
    url: `/posts/${postId}`,
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return data.data;
}

/**
 * Función para consultar los posts paginados.
 * Devuelve los posts de los usuarios seguidos por el usuario que consulta.
 */
export const fetchPosts = async (page: number, getToken: () => Promise<string | null>) => {
  const token = await getToken();

  const {data} = await axiosInstance<{
    data: PostWithLikes[];
    hasMore: boolean;
    nextPage: number | null;
  }>({
    method: "GET",
    url: "/posts",
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

/** Función para obtener los comentarios de un post */
export const getComments = async ({postId, page, getToken}: {postId: string | undefined; page: number; getToken: () => Promise<string | null>}) => {
  const token = await getToken();
  
  const {data} = await axiosInstance<{
    data: Comment[];
    hasMore: boolean;
    nextPage: number | null;
  }>({
    method: "GET",
    url: `/comments/posts/${postId}`,
    headers: {
      Authorization: `Bearer ${token}`
    },
    params: {
      page,
      limit: 5
    }
  });

  return data;
}