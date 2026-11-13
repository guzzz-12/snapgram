import { convertJWKToCryptoKey, decryptHybrid } from "./hybridCrypto";
import type { MessageType } from "@/types/global";

/** Función para descifrar el texto y archivos adjuntos de un mensaje */
export const decryptMessage = async (message: MessageType, currentUserId: string): Promise<MessageType> => {
  try {
    // Comprobar si el mensaje ha sido borrado para todos o para el usuario actual
    const isDeleted = Boolean(message.deletedForAll || message.deletedFor?.includes(currentUserId));

    if (isDeleted) {
      return {
        ...message,
        text: "Mensaje eliminado",
        fileUrls: null,
      };
    }

    // Buscar la llave privada del usuario actual
    const myPrivateStoredKey = localStorage.getItem("privateKey");
    const parsedJWKPrivateKey: JsonWebKey | null = myPrivateStoredKey
      ? JSON.parse(myPrivateStoredKey)
      : null;

    if (!parsedJWKPrivateKey || (!message.text && !message.fileUrls)) {
      return message;
    }

    // Buscar la llave AES del usuario en la data del mensaje
    const encryptedAesKey = message.cryptoKeys?.find((key) => key.userId === currentUserId);

    if (!encryptedAesKey || !message.initVector) {
      return message;
    }

    // Convertir la llave RSA de JsonWebKey a CryptoKey
    const myPrivateKey = await convertJWKToCryptoKey(parsedJWKPrivateKey, "private");

    // Desencriptar el texto del mensaje si existe
    const decryptedText = message.text
      ? await decryptHybrid(
          {
            content: message.text,
            encryptedKey: encryptedAesKey.encryptedKey,
            iv: message.initVector,
          },
          myPrivateKey
        )
      : message.text;

    // Desencriptar las urls de los archivos adjuntos si existen (sin mutar el objeto original)
    const decryptedFileUrls = message.fileUrls
      ? await decryptHybrid(
          {
            content: message.fileUrls,
            encryptedKey: encryptedAesKey.encryptedKey,
            iv: message.initVector,
          },
          myPrivateKey
        )
      : message.fileUrls;

    return {
      ...message,
      text: decryptedText,
      fileUrls: decryptedFileUrls,
    };
  } catch (error) {
    console.log({ error, id: message._id });
    return message;
  }
}