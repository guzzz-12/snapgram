import { useState, type ChangeEvent, type RefObject } from "react";
import { toast } from "sonner";
import { imageProcessor } from "@/utils/imageCompressor";

interface Props {
  fileInputRef: RefObject<HTMLInputElement | null>;
  maxSize?: number;
}

const useImagePicker = ({ fileInputRef, maxSize }: Props) => {
  const [selectedImageFiles, setSelectedImageFiles] = useState<File[]>([]);
  const [selectedImagePreviews, setSelectedImagePreviews] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const onImagePickHandler = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;

    if(files) {
      if ((selectedImageFiles.length + files.length > 10) || files.length > 10) {
        toast.error("Solo puedes seleccionar un máximo de 10 imágenes");
        return false;
      }

      setIsProcessing(true);

      const filesArray = Array.from(files!);

      const imagePreviewsPromises = filesArray.map((file) => {
        return imageProcessor(file, "base64", maxSize) as Promise<string>
      });
      
      const filesPromises = filesArray.map((file) => {
        return imageProcessor(file, "file", maxSize) as Promise<File>
      });

      const imagesBase64 = await Promise.all(imagePreviewsPromises);
      const compressedImages = await Promise.all(filesPromises);

      setSelectedImagePreviews(prev => [...imagesBase64, ...prev]);
      setSelectedImageFiles(prev => [...compressedImages, ...prev]);

      setIsProcessing(false);
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
    onImagePickHandler,
    isProcessing
  };
}

export default useImagePicker