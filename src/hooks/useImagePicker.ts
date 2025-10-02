import { useState, type ChangeEvent, type RefObject } from "react";
import { toast } from "sonner";
import { imageProcessor } from "@/utils/imageCompressor";

interface Props {
  fileInputRef: RefObject<HTMLInputElement | null>;
}

const useImagePicker = ({ fileInputRef }: Props) => {
  const [selectedImageFiles, setSelectedImageFiles] = useState<File[]>([]);
  const [selectedImagePreviews, setSelectedImagePreviews] = useState<string[]>([]);

  const onImagePickHandler = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;

    if(files) {
      if ((selectedImageFiles.length + files.length > 10) || files.length > 10) {
        toast.error("Solo puedes seleccionar un máximo de 10 imágenes");
        return false;
      }

      const filesArray = Array.from(files!);

      const imagePreviewsPromises = filesArray.map((file) => imageProcessor(file, "base64") as Promise<string>);
      const filesPromises = filesArray.map((file) => imageProcessor(file, "file") as Promise<File>);

      const imagesBase64 = await Promise.all(imagePreviewsPromises);
      const compressedImages = await Promise.all(filesPromises);

      setSelectedImagePreviews(prev => [...imagesBase64, ...prev]);
      setSelectedImageFiles(prev => [...compressedImages, ...prev]);
    };

    // Limpiar el ref del input luego de seleccionar la imagen
    // para restablecer el evento change del input.
    if(fileInputRef.current) {
      fileInputRef.current.value = ""
    };
  };

  return {
    selectedImageFiles,
    selectedImagePreviews,
    setSelectedImageFiles,
    setSelectedImagePreviews,
    onImagePickHandler
  };
}

export default useImagePicker