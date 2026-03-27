import { axiosInstance } from "@/utils/axiosInstance";
import type { PostWithLikes, UserType } from "@/types/global";
import { filesUploader } from "@/utils/filesUploader";

type CreatePostParams = {
  user: UserType | null;
  textContent: string;
  selectedImageFiles: File[];
  getToken: () => Promise<string | null>;
};

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

/** Función para crear un post */
export const createPostFn = async (params: CreatePostParams) => {
  const {user, textContent, selectedImageFiles, getToken} = params;

  if ((!textContent && selectedImageFiles.length === 0) || !user) return;

  const token1 = await getToken();

  // Subir las imágenes a ImageKit si las hay
  const uploadData = selectedImageFiles.length > 0 ? await filesUploader({
    files: selectedImageFiles,
    clerkToken: token1!,
    folderName: `/posts/${user._id}`,
    currentUser: user
  }) : [];

  // El primer token de acceso ya está posiblemente expirado en este punto
  // Generar un nuevo token para la consulta de creación del post
  // una vez que todas las imágenes ya se hayan subido a ImageKit
  const token2 = await getToken();

  // Crear el post
  const {data} = await axiosInstance<{data: PostWithLikes}>({
    method: "POST",
    url: "/posts",
    data: {
      content: textContent,
      imageUrls: uploadData.map(uData => uData.fileUrl),
      imageFileIds: uploadData.map(uData => uData.fileId)
    },
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token2!}`
    }
  });

  return data;
}