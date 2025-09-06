import { useState, type ChangeEvent, type RefObject } from "react";
import { imageProcessor } from "@/utils/imageCompressor";

interface Props {
  fileInputRef: RefObject<HTMLInputElement | null>;
}

const useImagePicker = ({ fileInputRef }: Props) => {
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);

  const onImagePickHandler = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;

    if(files) {
      const file = files[0];

      const imageBase64 = await imageProcessor(file, "base64") as string;
      const compressedImage = await imageProcessor(file, "file") as File;

      setSelectedImagePreview(imageBase64);
      setSelectedImageFile(compressedImage);
    };

    // Limpiar el ref del input luego de seleccionar la imagen
    // para restablecer el evento change del input.
    if(fileInputRef.current) {
      fileInputRef.current.value = ""
    };
  };

  return {
    selectedImageFile,
    selectedImagePreview,
    setSelectedImageFile,
    setSelectedImagePreview,
    onImagePickHandler
  };
}

export default useImagePicker