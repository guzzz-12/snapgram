import { convertJWKToCryptoKey, encryptHybrid } from "./hybridCrypto";
import type { UserType } from "@/types/global";

interface Props {
  text: string;
  recipientsPublicKeys: {userId: string, publicKey: JsonWebKey}[];
  currentUser: UserType | null;
  filesUrls?: string[];
};

/**
 * Encriptar el mensaje, las urls de los archivos y las llaves de cifrado del mensaje
 * Se genera una clave de cifrado AES aleatoria para cada miembro del chat
 * y cada clave va cifrada con la llave pública de cada miembro del chat
 */
export const encryptMsgContent = async (props: Props) => {
  const {text, currentUser, recipientsPublicKeys, filesUrls} = props;

  const senderPublicJWKKey = localStorage.getItem("publicKey");
  let parsedSenderPublicKey: JsonWebKey | null = null;

  if (senderPublicJWKKey) {
    parsedSenderPublicKey = JSON.parse(senderPublicJWKKey);
  }

  if (!parsedSenderPublicKey) {
    throw new Error("No pudimos obtener tu clave pública de cifrado o aún no la has creado.");
  }

  if (!recipientsPublicKeys.length) {
    throw new Error("Este usuario aún no ha creado sus claves de cifrado.");
  }

  // Convertir la llave pública de cifrado del remitente de JsonWebKey a CryptoKey
  const senderKey = await convertJWKToCryptoKey(parsedSenderPublicKey, "public");

  // Array de todas las claves públicas de los miembros del chat
  const allPublicKeys = [
    {publicKey: senderKey, userId: currentUser?._id || ""}
  ];

  // Convertir las llaves públicas de los recipientes de JsonWebKey a CryptoKey
  for (const key of recipientsPublicKeys) {
    const userKey = await convertJWKToCryptoKey(key.publicKey, "public");
    
    allPublicKeys.push({
      publicKey: userKey,
      userId: key.userId.replace("temp_", "")
    });
  }

  // Encriptar el mensaje, las urls de los archivos y
  // generar una clave cifrada para cada miembro del chat
  const {encryptedMessage, encryptedFileUrls, encryptedKeys, iv} = await encryptHybrid(
    text,
    allPublicKeys,
    filesUrls,
  );

  return {
    encryptedMessage,
    encryptedFileUrls,
    encryptedKeys,
    iv
  };
};