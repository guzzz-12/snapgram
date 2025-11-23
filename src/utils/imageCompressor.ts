import browserImageCompression from "browser-image-compression";

/**
 * Comprimir una imagen a webp o convertirla en base64
 */
export const imageProcessor = async (
  file: File,
  resultType: "file" | "base64",
  maxSize?: number
): Promise<File | string> => {
  try {
    if (resultType === "base64") {
      return new Promise((resolve, reject) => {
        const fileReader = new FileReader();

        fileReader.readAsDataURL(file);

        fileReader.onload = () => {
          resolve(fileReader.result?.toString() || "")
        };

        fileReader.onerror = (err) => reject(err)
      });
    }

    const compressedImage = await browserImageCompression(file, {
      fileType: "image/webp",
      maxSizeMB: 5,
      maxWidthOrHeight: maxSize || 4000,
      initialQuality: 0.75,
      useWebWorker: true
    });

    return compressedImage;
    
  } catch (error: any) {
    console.log(error.message);
    throw new Error(error.message);
  }
};