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

  // Mapear las propiedades de formato API a formato Domain.
  // De esta forma si en el futuro, por ejemplo, la propiedad _id cambia a id en la base de datos,
  // sólo sería necesario actualizarla en el mapper, en lugar de actualizarla
  // en los services y en todos los componentes la capa view (capa presentacional).
  // return {
  //   data: data.data.map(post => {
  //     return {
  //       ...post,
  //       id: post._id,
  //       user: {
  //         ...post.user,
  //         id: post.user._id
  //       }
  //     }
  //   }),
  //   hasMore: data.hasMore,
  //   nextPage: data.nextPage
  // };
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