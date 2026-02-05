import { convertJWKToCryptoKey } from "./hybridCrypto";
import { base64ToUint8 } from "./b64ToUint8";
import type { MessageType } from "@/types/global";

interface Props {
  updatedText: string;
  message: MessageType;
  currentUserId: string;
}

/** Función para encriptar el edit de un mensaje */
export const encryptEditedMessage = async (props: Props) => {
  const { updatedText, message, currentUserId } = props;

  // Buscar la llave cifrada del mensaje correpondiente al usuario
  const msgUserKeyData = message.cryptoKeys.find(key => key.userId === currentUserId)!;
  const msgUserKey = msgUserKeyData.encryptedKey;
  const encryptedKeyBytes = base64ToUint8(msgUserKey);

  // Buscar la llave privada del usuario actual
  const myPrivateStoredKey = localStorage.getItem("privateKey");
  let parsedJWKPrivateKey: JsonWebKey | null = null;

  if (myPrivateStoredKey) {
    parsedJWKPrivateKey = JSON.parse(myPrivateStoredKey);
  }
  
  if (!parsedJWKPrivateKey) {
    return {
      updatedMsgEncrypted: message.text
    }
  }

  // Convertir la llave privada del usuario de JsonWebKey a CryptoKey
  const myPrivateKey = await convertJWKToCryptoKey(parsedJWKPrivateKey, "private");

  // Desencriptar la llave AES del mensaje usando la llave privada del usuario
  const decryptedAesKeyRaw = await window.crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    myPrivateKey,
    encryptedKeyBytes
  );

  // Extraer la llave AES desencriptada
  const aesKey = await window.crypto.subtle.importKey(
    "raw",
    decryptedAesKeyRaw,
    "AES-GCM",
    false,
    ["encrypt"]
  );

  const encoder = new TextEncoder();

  // Generar un nuevo vector de inicialización
  const initVector = window.crypto.getRandomValues(new Uint8Array(12));

  // Cifrar el edit del mensaje con la llave AES del mensaje
  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: initVector },
    aesKey,
    encoder.encode(updatedText)
  );

  return {
    updatedMsgEncrypted: btoa(String.fromCharCode(...new Uint8Array(encryptedContent))),
    updatedIv: btoa(String.fromCharCode(...initVector))
  };
}