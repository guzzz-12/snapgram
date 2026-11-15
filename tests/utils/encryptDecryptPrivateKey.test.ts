import { describe, it, expect } from "vitest";
import {
  getAESKeyFromPassword,
  protectPrivateKey,
  decryptPrivateKeyFromPin
} from "@/utils/encryptDecryptPrivateKey";
import { getCachedMockKeyPair } from "../mocks/cryptoKeys/factories";

describe("encryptDecryptPrivateKey", () => {
  const validPin = "123456";

  it("cifra un JWK privado con un PIN devolviendo { encryptedKey, salt, iv } en Base64 y reconstruye exactamente el mismo JsonWebKey al descifrarlo", async () => {
    const { privateKeyJWK } = await getCachedMockKeyPair("primary");

    const saltBytes = window.crypto.getRandomValues(new Uint8Array(16));
    const derivedAesKey = await getAESKeyFromPassword(validPin, saltBytes);

    expect(derivedAesKey.type).toBe("secret");
    expect(derivedAesKey.algorithm.name).toBe("AES-GCM");
    expect(derivedAesKey.usages).toEqual(["encrypt", "decrypt"]);

    const { encryptedKey, salt, iv } = await protectPrivateKey(privateKeyJWK, validPin);

    expect(typeof encryptedKey).toBe("string");
    expect(encryptedKey.length).toBeGreaterThan(0);
    expect(typeof salt).toBe("string");
    expect(salt.length).toBeGreaterThan(0);
    expect(typeof iv).toBe("string");
    expect(iv.length).toBeGreaterThan(0);

    const recoveredJWK = await decryptPrivateKeyFromPin(encryptedKey, salt, iv, validPin);

    expect(recoveredJWK).toEqual(privateKeyJWK);
  });

  it("lanza una excepción con el mensaje exacto 'PIN incorrecto.' cuando el PIN no coincide con el usado al cifrar", async () => {
    const { privateKeyJWK } = await getCachedMockKeyPair("primary");
    const { encryptedKey, salt, iv } = await protectPrivateKey(privateKeyJWK, validPin);

    await expect(
      decryptPrivateKeyFromPin(encryptedKey, salt, iv, "999999")
    ).rejects.toThrowError("PIN incorrecto.");
  });

  it("produce valores distintos de salt, iv y encryptedKey en dos ejecuciones consecutivas con el mismo JWK y el mismo PIN", async () => {
    const { privateKeyJWK } = await getCachedMockKeyPair("primary");

    const firstProtection = await protectPrivateKey(privateKeyJWK, validPin);
    const secondProtection = await protectPrivateKey(privateKeyJWK, validPin);

    expect(firstProtection.salt).not.toBe(secondProtection.salt);
    expect(firstProtection.iv).not.toBe(secondProtection.iv);
    expect(firstProtection.encryptedKey).not.toBe(secondProtection.encryptedKey);
  });

  it("lanza 'PIN incorrecto.' si el saltB64 o el ivB64 están alterados o corruptos", async () => {
    const { privateKeyJWK } = await getCachedMockKeyPair("primary");
    const { encryptedKey, salt, iv } = await protectPrivateKey(privateKeyJWK, validPin);

    const alteredSalt = btoa(String.fromCharCode(...new Uint8Array(16).fill(1)));
    const alteredIv = btoa(String.fromCharCode(...new Uint8Array(12).fill(2)));

    await expect(
      decryptPrivateKeyFromPin(encryptedKey, alteredSalt, iv, validPin)
    ).rejects.toThrowError("PIN incorrecto.");

    await expect(
      decryptPrivateKeyFromPin(encryptedKey, salt, alteredIv, validPin)
    ).rejects.toThrowError("PIN incorrecto.");
  });
});
