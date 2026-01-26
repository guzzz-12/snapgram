import { convertJWKToCryptoKey, decryptHybrid } from "./hybridCrypto";
import type { MessageType } from "@/types/global";

/** Función para descifrar el texto de un mensaje */
export const decryptMessage = async (message: MessageType, currentUserId: string): Promise<MessageType> => {
  try {
    // Buscar la llave privada del usuario actual
    const myPrivateStoredKey = localStorage.getItem("privateKey");
    let parsedJWKPrivateKey: JsonWebKey | null = null;
  
    if (myPrivateStoredKey) {
      parsedJWKPrivateKey = JSON.parse(myPrivateStoredKey);
    }
    
    if (!parsedJWKPrivateKey || !message.text) {
      return message;
    }
  
    // Convertir la llave RSA de JsonWebKey a CryptoKey
    const myPrivateKey = await convertJWKToCryptoKey(parsedJWKPrivateKey, "private");
  
    // Buscar la llave AES del usuario en la data del mensaje
    const encriptedAesKey = message.cryptoKeys.find(key => key.userId === currentUserId);
  
    // Comprobar si el mensaje ha sido borrado para todos o para el usuario actual
    const isDeleted = message.deletedForAll || message.deletedFor.includes(currentUserId);

    if (!encriptedAesKey || isDeleted) {
      return message;
    } 
  
    // Desencriptar el mensaje
    const decriptedText = await decryptHybrid(
      {
        content: message.text,
        encryptedKey: encriptedAesKey.encryptedKey,
        iv: message.initVector
      },
      myPrivateKey
    );

    // Desencriptar las urls de los archivos adjuntos
    if (message.fileUrls) {
      const decriptedFileUrls = await decryptHybrid(
        {
          content: message.fileUrls,
          encryptedKey: encriptedAesKey.encryptedKey,
          iv: message.initVector
        },
        myPrivateKey
      );
  
      message.fileUrls = decriptedFileUrls;
    }
  
    const decryptedMessage = {...message, text: decriptedText};
  
    return decryptedMessage;

  } catch (error) {
    console.log({error, id: message._id});
    return message;
  }
}