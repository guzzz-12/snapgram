import { useCallback, useState, type ChangeEvent, type RefObject } from "react";
import { toast } from "sonner";
import { imageProcessor } from "@/utils/imageCompressor";

interface Props {
  fileInputRef: RefObject<HTMLInputElement | null>;
  maxSize?: number;
}

const MAX_IMAGES = 10;

const useImagePicker = ({ fileInputRef, maxSize }: Props) => {
  const [selectedImageFiles, setSelectedImageFiles] = useState<File[]>([]);
  const [selectedImagePreviews, setSelectedImagePreviews] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const onImagePickHandler = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;

    if (files && files.length > 0) {
      if (selectedImageFiles.length + files.length > MAX_IMAGES || files.length > MAX_IMAGES) {
        toast.error("Solo puedes seleccionar un máximo de 10 imágenes");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return false;
      }

      setIsProcessing(true);

      try {
        const filesArray = Array.from(files);

        const imagePreviewsPromises = filesArray.map((file) => {
          return imageProcessor(file, "base64", maxSize) as Promise<string>;
        });

        const filesPromises = filesArray.map((file) => {
          return imageProcessor(file, "file", maxSize) as Promise<File>;
        });

        const [imagesBase64, compressedImages] = await Promise.all([
          Promise.all(imagePreviewsPromises),
          Promise.all(filesPromises),
        ]);

        setSelectedImagePreviews((prev) => [...imagesBase64, ...prev]);
        setSelectedImageFiles((prev) => [...compressedImages, ...prev]);
      } catch {
        toast.error("Error al procesar las imágenes seleccionadas.");
      } finally {
        setIsProcessing(false);
      }
    }

    // Limpiar el ref del input luego de seleccionar la imagen
    // para restablecer el evento change del input.
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /**
   * Elimina una imagen y su preview de forma sincronizada por índice.
   */
  const removeImageAt = useCallback((index: number) => {
    setSelectedImageFiles((prev) => prev.filter((_, i) => i !== index));
    setSelectedImagePreviews((prev) => prev.filter((_, i) => i !== index));
  }, []);

  /**
   * Reemplaza el preview y el archivo en el índice indicado preservando el orden de la lista.
   * Re-ejecuta la compresión y estandarización mediante `imageProcessor`.
   */
  const replaceImageAt = useCallback(
    async (index: number, croppedFile: File): Promise<boolean> => {
      if (index < 0) return false;

      try {
        const [updatedPreview, compressedFile] = await Promise.all([
          imageProcessor(croppedFile, "base64", maxSize) as Promise<string>,
          imageProcessor(croppedFile, "file", maxSize) as Promise<File>,
        ]);

        setSelectedImagePreviews((prev) =>
          prev.map((preview, i) => (i === index ? updatedPreview : preview))
        );
        setSelectedImageFiles((prev) =>
          prev.map((file, i) => (i === index ? compressedFile : file))
        );

        return true;
      } catch {
        toast.error("No se pudo actualizar la imagen recortada.");
        return false;
      }
    },
    [maxSize]
  );

  return {
    selectedImageFiles,
    selectedImagePreviews,
    setSelectedImageFiles,
    setSelectedImagePreviews,
    onImagePickHandler,
    removeImageAt,
    replaceImageAt,
    isProcessing,
  };
};

export default useImagePicker;