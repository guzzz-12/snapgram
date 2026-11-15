import { faker } from "@faker-js/faker";
import { convertJWKToCryptoKey, generateKeyPair } from "@/utils/hybridCrypto";

export interface MockKeyPairBundle {
  publicKeyJWK: JsonWebKey;
  privateKeyJWK: JsonWebKey;
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

const keyPairCache = new Map<string, Promise<MockKeyPairBundle>>();

/**
 * Genera y cachea en memoria un par de llaves RSA-OAEP (en formato JWK y CryptoKey)
 * identificado por un alias para evitar regenerar claves RSA de 2048 bits en cada test.
 */
export const getCachedMockKeyPair = (alias = "primary"): Promise<MockKeyPairBundle> => {
  const existing = keyPairCache.get(alias);

  if (existing) {
    return existing;
  }

  const bundlePromise = (async () => {
    const { publicKey: publicKeyJWK, privateKey: privateKeyJWK } = await generateKeyPair();
    const [publicKey, privateKey] = await Promise.all([
      convertJWKToCryptoKey(publicKeyJWK, "public"),
      convertJWKToCryptoKey(privateKeyJWK, "private")
    ]);

    return {
      publicKeyJWK,
      privateKeyJWK,
      publicKey,
      privateKey
    };
  })();

  keyPairCache.set(alias, bundlePromise);

  return bundlePromise;
};

/**
 * Construye una entrada de llave pública de destinatario compatible con los servicios de chat.
 */
export const buildMockRecipientPublicKey = async (overrides?: {
  userId?: string;
  alias?: string;
}): Promise<{
  userId: string;
  publicKeyJWK: JsonWebKey;
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}> => {
  const userId = overrides?.userId ?? faker.database.mongodbObjectId();
  const alias = overrides?.alias ?? userId;
  const bundle = await getCachedMockKeyPair(alias);

  return {
    userId,
    publicKeyJWK: bundle.publicKeyJWK,
    publicKey: bundle.publicKey,
    privateKey: bundle.privateKey
  };
};
