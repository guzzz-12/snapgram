import { upload, type UploadResponse } from "@imagekit/react";
import { axiosInstance } from "./axiosInstance";
import type { UserType } from "@/types/global";

interface Props {
  files: File[];
  clerkToken: string;
  currentUser: UserType | null;
  folderName: string;
}

type Signature = {
  expire: number;
  signature: string;
  token: string;
}

/** Subir imagen(es) a ImageKit */
export const imagesUploader = async (props: Props) => {
  if (!props.currentUser) {
    return [];
  }

  const { files, clerkToken, currentUser, folderName } = props;

  if (!files || files.length === 0) {
    throw new Error("No se ha proporcionado un archivo válido");
  }

  // Generar los signatures para autorizar las subidas a imageKit
  const {data: signaturesData} = await axiosInstance<{data: Signature[]}>({
    method: "POST",
    url: "/storage/upload-signature",
    data: {
      // Solicitar un signature para cada imagen a subir
      amount: files.length
    },
    headers: {
      Authorization: `Bearer ${clerkToken}`
    }
  });

  const signatures = signaturesData.data;

  const uploadPromises: Promise<UploadResponse>[] = [];

  // Crear un promise por cada imagen a subir
  files.forEach((file, index) => {
    const fileExtension = file.type.split("/")[1];
    const fileName = `${currentUser.username}_${Date.now()}.${fileExtension}`;

    uploadPromises.push(upload({
      file: file,
      folder: folderName,
      fileName,
      signature: signatures[index].signature,
      expire: signatures[index].expire,
      token: signatures[index].token,
      publicKey: import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY
    }));
  });

  // Esperar a que se suban todas las imagenes de forma paralela
  const uploadData = await Promise.all(uploadPromises);

  return uploadData
  .map(data => ({
    imageUrl: data.url,
    imageFileId: data.fileId
  }))
  .filter((data) => data.imageUrl && data.imageFileId);
}