import { generateKeyPair } from "@/utils/hybridCrypto";
import { decryptPrivateKeyFromPin, protectPrivateKey } from "@/utils/encryptDecryptPrivateKey";
import { axiosInstance } from "@/utils/axiosInstance";
import type { UserType } from "@/types/global";

type CreateCryptoKeysParams = {
  user: UserType | null;
  pin: string;
  operation: "create" | "update";
}

type FetchCryptoKeysParams = {
  user: UserType | null;
  pin: string;
}

/** Función para crear y almacenar el par de claves de cifrado (publica y privada) del usuario */
export const createCryptoKeys = async (params: CreateCryptoKeysParams) => {
  const { user, pin, operation } = params;

  if (!user) {
    return;
  }

  // El nuevo par de claves de cifrado del usuario (sin cifrar)
  const {privateKey, publicKey} = await generateKeyPair();
  
  // Cifrar la llave privada para almacenarla de manera segura en la base de datos
  const {encryptedKey, salt, iv} = await protectPrivateKey(privateKey, pin);

  const {data} = await axiosInstance<{
    publicKey: CryptoKey;
    privateKeyLock: {
      key: string;
      salt: string;
      iv: string;
    };
  }>({
    method: "POST",
    url: "/crypto-keys/store-user-keys",
    data: {
      privateKey: encryptedKey,
      publicKey,
      salt,
      iv
    },
    params: {
      operation
    },
    headers: {
      "Content-Type": "application/json"
    }
  });

  // Almacenar las claves en el localStorage
  localStorage.setItem("publicKey", JSON.stringify(publicKey));
  localStorage.setItem("privateKey", JSON.stringify(privateKey));

  return data;
}

/** Función para obtener las claves de cifrado del usuario */
export const fetchUserCryptoKeys = async (params: FetchCryptoKeysParams) => {
  const { user, pin } = params;

  if (!user) {
    return;
  }

  const {data} = await axiosInstance<{
    publicKey: CryptoKey;
    privateKeyLock: {
      key: string;
      salt: string;
      iv: string;
    };
  }>({
    method: "GET",
    url: "/crypto-keys/get-my-keys",
    headers: {
      "Content-Type": "application/json"
    }
  });

  const {key, salt, iv} = data.privateKeyLock;

  const decryptedPrivateKey = await decryptPrivateKeyFromPin(key, salt, iv, pin);

  localStorage.setItem("publicKey", JSON.stringify(data.publicKey));
  localStorage.setItem("privateKey", JSON.stringify(decryptedPrivateKey));

  return data;
}