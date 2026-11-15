import { describe, it, expect, vi } from "vitest";
import {
  generateKeyPair,
  convertJWKToCryptoKey,
  encryptHybrid,
  decryptHybrid
} from "@/utils/hybridCrypto";
import {
  buildMockRecipientPublicKey,
  getCachedMockKeyPair
} from "../mocks/cryptoKeys/factories";

describe("hybridCrypto", () => {
  it("genera un par JWK RSA-OAEP válido y lo importa como CryptoKey pública (encrypt) y privada (decrypt)", async () => {
    const { publicKey: publicKeyJWK, privateKey: privateKeyJWK } = await generateKeyPair();

    expect(publicKeyJWK.kty).toBe("RSA");
    expect(publicKeyJWK.alg).toBe("RSA-OAEP-256");
    expect(publicKeyJWK.n).toBeDefined();
    expect(publicKeyJWK.d).toBeUndefined();

    expect(privateKeyJWK.kty).toBe("RSA");
    expect(privateKeyJWK.alg).toBe("RSA-OAEP-256");
    expect(privateKeyJWK.d).toBeDefined();

    const publicKey = await convertJWKToCryptoKey(publicKeyJWK, "public");
    const privateKey = await convertJWKToCryptoKey(privateKeyJWK, "private");

    expect(publicKey.type).toBe("public");
    expect(publicKey.algorithm.name).toBe("RSA-OAEP");
    expect(publicKey.usages).toEqual(["encrypt"]);

    expect(privateKey.type).toBe("private");
    expect(privateKey.algorithm.name).toBe("RSA-OAEP");
    expect(privateKey.usages).toEqual(["decrypt"]);
  });

  it("cifra texto y fileUrls para múltiples destinatarios y recupera el contenido original con la clave privada de cada uno", async () => {
    const sender = await buildMockRecipientPublicKey({ userId: "user_sender", alias: "sender" });
    const recipient = await buildMockRecipientPublicKey({ userId: "user_recipient", alias: "recipient" });

    const originalText = "¡Hola! Mensaje cifrado de extremo a extremo 🔒";
    const originalFileUrls = [
      "https://ik.imagekit.io/snapgram/image1.webp",
      "https://ik.imagekit.io/snapgram/image2.webp"
    ];

    const encrypted = await encryptHybrid(
      originalText,
      [
        { userId: sender.userId, publicKey: sender.publicKey },
        { userId: recipient.userId, publicKey: recipient.publicKey }
      ],
      originalFileUrls
    );

    expect(encrypted.encryptedMessage).not.toBe(originalText);
    expect(encrypted.encryptedFileUrls).not.toBe("");
    expect(encrypted.iv).toBeTruthy();
    expect(encrypted.encryptedKeys).toHaveLength(2);

    const senderEncryptedKey = encrypted.encryptedKeys.find((k) => k.userId === sender.userId)!;
    const recipientEncryptedKey = encrypted.encryptedKeys.find((k) => k.userId === recipient.userId)!;

    // El remitente puede descifrar tanto el texto como los fileUrls
    const decryptedTextBySender = await decryptHybrid(
      {
        content: encrypted.encryptedMessage,
        encryptedKey: senderEncryptedKey.encryptedKey,
        iv: encrypted.iv
      },
      sender.privateKey
    );
    expect(decryptedTextBySender).toBe(originalText);

    // El destinatario también puede descifrar el texto y las URLs de archivos
    const decryptedTextByRecipient = await decryptHybrid(
      {
        content: encrypted.encryptedMessage,
        encryptedKey: recipientEncryptedKey.encryptedKey,
        iv: encrypted.iv
      },
      recipient.privateKey
    );
    const decryptedFilesByRecipient = await decryptHybrid(
      {
        content: encrypted.encryptedFileUrls,
        encryptedKey: recipientEncryptedKey.encryptedKey,
        iv: encrypted.iv
      },
      recipient.privateKey
    );

    expect(decryptedTextByRecipient).toBe(originalText);
    expect(JSON.parse(decryptedFilesByRecipient)).toEqual(originalFileUrls);
  });

  it("retorna encryptedFileUrls como string vacío ('') cuando no se proporcionan fileUrls", async () => {
    const recipient = await buildMockRecipientPublicKey({ userId: "user_1", alias: "sender" });

    const encrypted = await encryptHybrid("Mensaje sin adjuntos", [
      { userId: recipient.userId, publicKey: recipient.publicKey }
    ]);

    expect(encrypted.encryptedFileUrls).toBe("");
    expect(encrypted.encryptedMessage).toBeTruthy();
    expect(encrypted.encryptedKeys).toHaveLength(1);
  });

  it("captura el error al descifrar con una clave privada incorrecta o un IV corrupto y retorna payload.content como fallback seguro", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const recipient = await getCachedMockKeyPair("sender");
    const intruder = await getCachedMockKeyPair("intruder");

    const encrypted = await encryptHybrid(
      "Mensaje confidencial",
      [{ userId: "user_1", publicKey: recipient.publicKey }]
    );

    const encryptedKey = encrypted.encryptedKeys[0].encryptedKey;

    // Intento de descifrado con una clave privada que no corresponde a la pública usada
    const wrongKeyResult = await decryptHybrid(
      {
        content: encrypted.encryptedMessage,
        encryptedKey,
        iv: encrypted.iv
      },
      intruder.privateKey
    );

    expect(wrongKeyResult).toBe(encrypted.encryptedMessage);

    // Intento de descifrado con la clave privada correcta pero un IV alterado
    const corruptedIv = btoa("corrupted_iv");
    const corruptedIvResult = await decryptHybrid(
      {
        content: encrypted.encryptedMessage,
        encryptedKey,
        iv: corruptedIv
      },
      recipient.privateKey
    );

    expect(corruptedIvResult).toBe(encrypted.encryptedMessage);

    logSpy.mockRestore();
  });
});
