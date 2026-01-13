/** Función para obtener la llave AES-GCM a partir del pin */
export const getAESKeyFromPassword = async (password: string, salt: Uint8Array) => {
  const enc = new TextEncoder();

  // Importar el password como material base
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]
  );

  // Derivar la llave AES-GCM de 256 bits
  return await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    } as Pbkdf2Params,
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/** Función para cifrar la llave privada RSA con la llave AES generada a partir del pin */
export const protectPrivateKey = async (privateKeyJWK: JsonWebKey, pin: string) => {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const aesKey = await getAESKeyFromPassword(pin, salt);

  const encryptedData = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    new TextEncoder().encode(JSON.stringify(privateKeyJWK))
  );

  return {
    encryptedKey: btoa(String.fromCharCode(...new Uint8Array(encryptedData))),
    salt: btoa(String.fromCharCode(...salt)),
    iv: btoa(String.fromCharCode(...iv))
  };
};

/**
 * Utilidad para recuperar la llave privada RSA (JsonWebKey)
 * a partir del material cifrado y el pin del usuario.
 */
export const decryptPrivateKeyFromPin = async (
  encryptedKeyB64: string,
  saltB64: string,
  ivB64: string,
  pin: string
): Promise<JsonWebKey> => {
  const encryptedData = new Uint8Array(atob(encryptedKeyB64).split("").map(c => c.charCodeAt(0)));
  const salt = new Uint8Array(atob(saltB64).split("").map(c => c.charCodeAt(0)));
  const iv = new Uint8Array(atob(ivB64).split("").map(c => c.charCodeAt(0)));

  try {
    // Regenerar la llave AES usando el pin y el salt originales
    const aesKey = await getAESKeyFromPassword(pin, salt);

    // Desencriptar la clave privada
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { 
        name: "AES-GCM", 
        iv: iv 
      },
      aesKey,
      encryptedData
    );

    const decodedJWK = new TextDecoder().decode(decryptedBuffer);

    return JSON.parse(decodedJWK) as JsonWebKey;

  } catch (error) {
    throw new Error("PIN incorrecto.");
  }
};