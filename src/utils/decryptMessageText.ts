import { convertJWKToCryptoKey, decryptHybrid } from "./hybridCrypto";
import type { MessageType } from "@/types/global";

/** Función para descifrar el texto de un mensaje */
export const decryptMessageText = async (message: MessageType, isCurrentUserSender: boolean): Promise<MessageType> => {
  const myPrivateStoredKey = localStorage.getItem("privateKey");
  let parsedJWKPrivateKey: JsonWebKey | null = null;

  if (myPrivateStoredKey) {
    parsedJWKPrivateKey = JSON.parse(myPrivateStoredKey);
  }
  
  if (!parsedJWKPrivateKey || !message.text) {
    return message;
  }

  const myPrivateKey = await convertJWKToCryptoKey(parsedJWKPrivateKey, "private");

  const encriptedAesKey = isCurrentUserSender ? message.senderCryptoKey : message.recipientCryptoKey;

  const decriptedText = await decryptHybrid(
    {
      content: message.text,
      encryptedKey: encriptedAesKey,
      iv: message.initVector
    },
    myPrivateKey
  );

  const decryptedMessage = {...message, text: decriptedText};

  return decryptedMessage;
}