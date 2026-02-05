import { convertJWKToCryptoKey, decryptHybrid } from "./hybridCrypto";
import type { MessageType } from "@/types/global";

/** Desencripta el historial de cambios de un mensaje */
export const decryptMsgHistory = async (msg: MessageType, userId: string) => {
  const decryptedMsg = {...msg};

  if (!decryptedMsg.history) {
    return msg;
  }

  const userKeyData = msg.cryptoKeys.find(key => key.userId === userId)!;
  const userMsgKey = userKeyData.encryptedKey;

  // Buscar la llave privada del usuario actual
  const myPrivateStoredKey = localStorage.getItem("privateKey");
  let parsedJWKPrivateKey: JsonWebKey | null = null;

  if (myPrivateStoredKey) {
    parsedJWKPrivateKey = JSON.parse(myPrivateStoredKey);
  }
  
  if (!parsedJWKPrivateKey) {
    return msg;
  }

  // Convertir la llave privada del usuario de JsonWebKey a CryptoKey
  const myPrivateKey = await convertJWKToCryptoKey(parsedJWKPrivateKey, "private");

  // Desencriptar el historial de cambios del mensaje
  for (const history of decryptedMsg.history) {
    history.previousContent = await decryptHybrid(
      {
        content: history.previousContent,
        encryptedKey: userMsgKey,
        iv: history.iv
      },
      myPrivateKey
    );
  }

  return decryptedMsg;
}