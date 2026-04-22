import { axiosInstance } from "@/utils/axiosInstance";
import type { PostWithLikes, UserType } from "@/types/global";
import { filesUploader } from "@/utils/filesUploader";

type CreatePostParams = {
  user: UserType | null;
  textContent: string;
  selectedImageFiles: File[];
};

/** Función para obtener un post mediante su ID */
export const getPost = async ({postId}: {postId: string | undefined}) => {
  if (!postId) return false;

  const {data} = await axiosInstance<{data: PostWithLikes}>({
    method: "GET",
    url: `/posts/${postId}`
  });

  return data.data;
}

/**
 * Función para consultar los posts paginados.
 * Devuelve los posts de los usuarios seguidos por el usuario que consulta.
 */
export const fetchPosts = async (page: number) => {
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
  const {user, textContent, selectedImageFiles} = params;

  if ((!textContent && selectedImageFiles.length === 0) || !user) return;

  // Subir las imágenes a ImageKit si las hay
  const uploadData = selectedImageFiles.length > 0 ? await filesUploader({
    files: selectedImageFiles,
    folderName: `/posts/${user._id}`,
    currentUser: user
  }) : [];

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
      "Content-Type": "application/json"
    }
  });

  return data;
}