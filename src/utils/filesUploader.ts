import { upload, type UploadResponse } from "@imagekit/react";
import { axiosInstance } from "./axiosInstance";
import type { UserType } from "@/types/global";

interface Props {
  files: File[];
  currentUser: UserType | null;
  folderName: string;
}

type Signature = {
  expire: number;
  signature: string;
  token: string;
}

export interface UploadedFile {
  fileUrl: string;
  fileId: string;
}

export class FilesUploadError extends Error {
  uploadedFiles: UploadedFile[];
  uploadedFileIds: string[];
  errors: unknown[];

  constructor(message: string, uploadedFiles: UploadedFile[], errors: unknown[]) {
    super(message);
    this.name = "FilesUploadError";
    this.uploadedFiles = uploadedFiles;
    this.uploadedFileIds = uploadedFiles.map((file) => file.fileId);
    this.errors = errors;
  }
}

const getFileExtension = (file: File): string => {
  const mimeSubtype = file.type?.split("/")[1]?.split(/[+;]/)[0]?.trim();
  const nameExtension = file.name.includes(".") ? file.name.split(".").pop()?.trim() : undefined;

  return mimeSubtype || nameExtension || "bin";
};

/** Subir imagen(es) a ImageKit */
export const filesUploader = async (props: Props): Promise<UploadedFile[]> => {
  if (!props.currentUser) {
    return [];
  }

  const { files, currentUser, folderName } = props;

  if (!files || files.length === 0) {
    throw new Error("No se ha proporcionado un archivo válido");
  }

  // Generar los signatures para autorizar las subidas a imageKit
  const {data: signaturesData} = await axiosInstance<{data: Signature[]}>({
    method: "POST",
    url: "/storage/upload-signature",
    data: {
      // Solicitar un signature para cada imagen a subir
      amount: files.length
    }
  });

  const signatures = signaturesData?.data;

  if (
    !Array.isArray(signatures) ||
    signatures.length < files.length ||
    signatures.slice(0, files.length).some(
      (sig) => !sig || !sig.signature || !sig.token || typeof sig.expire !== "number"
    )
  ) {
    throw new Error("No se recibieron firmas de autorización válidas para todos los archivos");
  }

  const uploadPromises: Promise<UploadResponse>[] = [];

  // Crear un promise por cada imagen a subir
  files.forEach((file, index) => {
    const fileExtension = getFileExtension(file);
    const fileName = `${currentUser.username}_${Date.now()}_${index}.${fileExtension}`;
    const signatureData = signatures[index];

    uploadPromises.push(upload({
      file: file,
      folder: folderName,
      fileName,
      signature: signatureData.signature,
      expire: signatureData.expire,
      token: signatureData.token,
      publicKey: import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY
    }));
  });

  // Esperar a que todas las subidas terminen sin perder los resultados exitosos si alguna falla
  const settledUploads = await Promise.allSettled(uploadPromises);

  const uploadedFiles = settledUploads
    .filter((result): result is PromiseFulfilledResult<UploadResponse> => result.status === "fulfilled")
    .map((result) => ({
      fileUrl: result.value.url,
      fileId: result.value.fileId
    }))
    .filter((data): data is UploadedFile => Boolean(data.fileUrl && data.fileId));

  const rejectedReasons = settledUploads
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map((result) => result.reason);

  if (rejectedReasons.length > 0) {
    const firstError = rejectedReasons[0];
    const errorMessage =
      firstError instanceof Error
        ? firstError.message
        : "Error al subir uno o más archivos a ImageKit";

    throw new FilesUploadError(errorMessage, uploadedFiles, rejectedReasons);
  }

  return uploadedFiles;
}