type DecryptHybridPayload = { encryptedKey: string; content: string; iv: string };

/**
 * Generar el par de llaves RSA (publica y privada)
 * del usuario para el cifrado de extremo a extremo
 */
export const generateKeyPair = async (): Promise<{
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
}> => {
  const cryptoKeyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true, // Extraíble (para guardar la pública)
    ["encrypt", "decrypt"]
  );

  // Extraer la llave publica y convertirla a JsonWebKey
  const exportedPublicKey = await window.crypto.subtle.exportKey(
    "jwk",
    cryptoKeyPair.publicKey
  );

  // Extraer la llave privada y convertirla a JsonWebKey
  const exportedPrivateKey = await window.crypto.subtle.exportKey(
    "jwk",
    cryptoKeyPair.privateKey
  );

  return {
    publicKey: exportedPublicKey,
    privateKey: exportedPrivateKey
  };
}


/** Función para generar una llave AES aleatoria para CADA mensaje */
const generateAESKey = async () => {
  return await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
};


/** Función para convertir la llave RSA de JsonWebKey a CryptoKey */
export const convertJWKToCryptoKey = async (jwk: JsonWebKey, type: "public" | "private"): Promise<CryptoKey> => {
  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    type === "public" ? ["encrypt"] : ["decrypt"]
  );
};


/** Función de Cifrado de Extremo a Extremo */
export const encryptHybrid = async (text: string, receiverPubKey: CryptoKey, senderPubKey: CryptoKey) => {
  const encoder = new TextEncoder();
  const aesKey = await generateAESKey();
  const initVector = window.crypto.getRandomValues(new Uint8Array(12));

  // Cifrar el mensaje con la llave AES
  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: initVector },
    aesKey,
    encoder.encode(text)
  );

  // Exportar la llave AES para cifrarla con RSA
  const exportedAesKey = await window.crypto.subtle.exportKey("raw", aesKey);

  // Cifrar la llave AES para el remitente y el recipiente
  const encryptedKeyForReceiver = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    receiverPubKey,
    exportedAesKey
  );

  const encryptedKeyForSender = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    senderPubKey,
    exportedAesKey
  );

  return {
    content: btoa(String.fromCharCode(...new Uint8Array(encryptedContent))),
    keyForSender: btoa(String.fromCharCode(...new Uint8Array(encryptedKeyForSender))),
    keyForRecipient: btoa(String.fromCharCode(...new Uint8Array(encryptedKeyForReceiver))),
    iv: btoa(String.fromCharCode(...initVector))
  };
};


/** Función de Descifrado de Extremo a Extremo */
export const decryptHybrid = async (payload: DecryptHybridPayload, myPrivateKey: CryptoKey) => {
  try {
    // Recuperar los bytes de los strings Base64
    const encryptedKeyBytes = new Uint8Array(atob(payload.encryptedKey).split("").map(c => c.charCodeAt(0)));
    const contentBytes = new Uint8Array(atob(payload.content).split("").map(c => c.charCodeAt(0)));
    const iv = new Uint8Array(atob(payload.iv).split("").map(c => c.charCodeAt(0)));
  
    // Descifrar la llave AES del mensaje usando la llave Privada RSA
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
      ["decrypt"]
    );
  
    // Descifrar el mensaje
    const decryptedContent = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      aesKey,
      contentBytes
    );
  
    const decodedMessageText = new TextDecoder().decode(decryptedContent);
  
    return decodedMessageText;

  } catch (error: any) {
    console.log(error.message);
    return payload.content;
  }
};