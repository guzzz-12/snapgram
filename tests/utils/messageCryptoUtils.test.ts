import { describe, it, expect, beforeEach } from "vitest";
import { encryptMsgContent } from "@/utils/encryptMsgContent";
import { decryptMessage } from "@/utils/decryptMessageText";
import { encryptEditedMessage } from "@/utils/encryptEditedMessage";
import { decryptMsgHistory } from "@/utils/decryptMsgHistory";
import { buildMockUser } from "../mocks/users/factories";
import { buildMockMessage } from "../mocks/chats/factories";
import { getCachedMockKeyPair } from "../mocks/cryptoKeys/factories";

/**
 * Suite de integración para el ciclo completo de cifrado y descifrado de mensajes E2E.
 *
 * Propósito:
 *   Validar la interoperabilidad entre los cuatro módulos que gestionan el ciclo de vida
 *   criptográfico de un mensaje en el cliente (envío, lectura, edición y consulta de historial)
 *   dependiendo de las llaves almacenadas en `localStorage`.
 *
 * Alcance / Módulos bajo prueba (SUT):
 *   - `src/utils/encryptMsgContent.ts` (`encryptMsgContent`): Cifrado inicial de texto/adjuntos y manejo de chats temporales.
 *   - `src/utils/decryptMessageText.ts` (`decryptMessage`): Descifrado en lectura, reemplazo seguro para mensajes eliminados y omisión si falta clave local.
 *   - `src/utils/encryptEditedMessage.ts` (`encryptEditedMessage`): Re-cifrado de ediciones reutilizando la clave AES original con un nuevo IV.
 *   - `src/utils/decryptMsgHistory.ts` (`decryptMsgHistory`): Descifrado secuencial del historial de versiones previas de un mensaje.
 */
describe("messageCryptoUtils (encryptMsgContent, decryptMessage, encryptEditedMessage, decryptMsgHistory)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("cifra el mensaje y fileUrls limpiando el prefijo 'temp_' del destinatario y restaura el contenido con decryptMessage", async () => {
    const senderKeys = await getCachedMockKeyPair("sender");
    const recipientKeys = await getCachedMockKeyPair("recipient");

    const senderUser = buildMockUser({ _id: "sender_user_1" });
    const recipientUserId = "recipient_user_2";

    // Almacenar la clave pública del remitente en localStorage para encryptMsgContent
    localStorage.setItem("publicKey", JSON.stringify(senderKeys.publicKeyJWK));

    const plainText = "Mensaje en chat temporal con imágenes";
    const filesUrls = ["https://ik.imagekit.io/snapgram/photo1.webp"];

    const encrypted = await encryptMsgContent({
      text: plainText,
      currentUser: senderUser,
      recipientsPublicKeys: [
        {
          userId: `temp_${recipientUserId}`,
          publicKey: recipientKeys.publicKeyJWK
        }
      ],
      filesUrls
    });

    // Verificar que el prefijo temp_ haya sido removido en encryptedKeys
    expect(encrypted.encryptedKeys).toHaveLength(2);
    expect(encrypted.encryptedKeys.map((k) => k.userId)).toEqual([
      senderUser._id,
      recipientUserId
    ]);

    // Construir el MessageType cifrado y descifrarlo desde la perspectiva del destinatario
    localStorage.setItem("privateKey", JSON.stringify(recipientKeys.privateKeyJWK));

    const messageRecord = buildMockMessage({
      text: encrypted.encryptedMessage,
      fileUrls: encrypted.encryptedFileUrls,
      cryptoKeys: encrypted.encryptedKeys,
      initVector: encrypted.iv
    });

    const decryptedMessage = await decryptMessage(messageRecord, recipientUserId);

    expect(decryptedMessage.text).toBe(plainText);
    expect(JSON.parse(decryptedMessage.fileUrls!)).toEqual(filesUrls);
  });

  it("lanza error en encryptMsgContent si falta publicKey en localStorage o si recipientsPublicKeys está vacío", async () => {
    const senderUser = buildMockUser();
    const recipientKeys = await getCachedMockKeyPair("recipient");

    // 1. Sin publicKey en localStorage
    await expect(
      encryptMsgContent({
        text: "Hola",
        currentUser: senderUser,
        recipientsPublicKeys: [
          { userId: "recipient_1", publicKey: recipientKeys.publicKeyJWK }
        ]
      })
    ).rejects.toThrowError(
      "No pudimos obtener tu clave pública de cifrado o aún no la has creado."
    );

    // 2. Con publicKey en localStorage pero sin claves de destinatarios
    const senderKeys = await getCachedMockKeyPair("sender");
    localStorage.setItem("publicKey", JSON.stringify(senderKeys.publicKeyJWK));

    await expect(
      encryptMsgContent({
        text: "Hola",
        currentUser: senderUser,
        recipientsPublicKeys: []
      })
    ).rejects.toThrowError("Este usuario aún no ha creado sus claves de cifrado.");
  });

  it("retorna 'Mensaje eliminado' en decryptMessage si está eliminado (deletedForAll / deletedFor) o sin descifrar si no existe privateKey en localStorage", async () => {
    const senderKeys = await getCachedMockKeyPair("sender");
    const recipientKeys = await getCachedMockKeyPair("recipient");
    const senderUser = buildMockUser({ _id: "sender_1" });
    const recipientId = "recipient_1";

    localStorage.setItem("publicKey", JSON.stringify(senderKeys.publicKeyJWK));

    const encrypted = await encryptMsgContent({
      text: "Secreto",
      currentUser: senderUser,
      recipientsPublicKeys: [{ userId: recipientId, publicKey: recipientKeys.publicKeyJWK }],
      filesUrls: ["https://ik.imagekit.io/snapgram/secret.webp"]
    });

    const baseMessage = buildMockMessage({
      text: encrypted.encryptedMessage,
      fileUrls: encrypted.encryptedFileUrls,
      cryptoKeys: encrypted.encryptedKeys,
      initVector: encrypted.iv
    });

    // Caso A: No hay privateKey en localStorage -> retorna sin descifrar
    const withoutPrivateKey = await decryptMessage({ ...baseMessage }, recipientId);
    expect(withoutPrivateKey.text).toBe(encrypted.encryptedMessage);
    expect(withoutPrivateKey.fileUrls).toBe(encrypted.encryptedFileUrls);

    // Guardar la clave privada válida para probar los casos de mensajes eliminados y sin campos opcionales
    localStorage.setItem("privateKey", JSON.stringify(recipientKeys.privateKeyJWK));

    // Caso B: Mensaje eliminado para todos (deletedForAll: true)
    const deletedForAllMsg = await decryptMessage(
      { ...baseMessage, deletedForAll: true },
      recipientId
    );
    expect(deletedForAllMsg.text).toBe("Mensaje eliminado");
    expect(deletedForAllMsg.fileUrls).toBeNull();

    // Caso C: Mensaje eliminado para el usuario actual (deletedFor incluye a recipientId)
    const deletedForMeMsg = await decryptMessage(
      { ...baseMessage, deletedFor: [recipientId] },
      recipientId
    );
    expect(deletedForMeMsg.text).toBe("Mensaje eliminado");
    expect(deletedForMeMsg.fileUrls).toBeNull();

    // Caso D: deletedFor / deletedForAll indefinidos (ej. preview lastMessage) -> descifra normalmente
    const { deletedFor: _df, deletedForAll: _dfa, ...partialMessage } = baseMessage;
    const decryptedPartialMsg = await decryptMessage(
      partialMessage as typeof baseMessage,
      recipientId
    );
    expect(decryptedPartialMsg.text).toBe("Secreto");
    expect(JSON.parse(decryptedPartialMsg.fileUrls!)).toEqual([
      "https://ik.imagekit.io/snapgram/secret.webp"
    ]);
  });

  it("reutiliza la llave AES en encryptEditedMessage con un nuevo IV y desencripta el historial de ediciones con decryptMsgHistory", async () => {
    const senderKeys = await getCachedMockKeyPair("sender");
    const recipientKeys = await getCachedMockKeyPair("recipient");
    const senderUser = buildMockUser({ _id: "sender_1" });
    const recipientId = "recipient_1";

    localStorage.setItem("publicKey", JSON.stringify(senderKeys.publicKeyJWK));
    localStorage.setItem("privateKey", JSON.stringify(senderKeys.privateKeyJWK));

    const firstVersionText = "Versión original del mensaje";
    const secondVersionText = " Segunda versión corregida";
    const finalVersionText = "Versión final definitiva";

    // Cifrar mensaje original
    const initialEncrypted = await encryptMsgContent({
      text: firstVersionText,
      currentUser: senderUser,
      recipientsPublicKeys: [{ userId: recipientId, publicKey: recipientKeys.publicKeyJWK }]
    });

    const originalMessage = buildMockMessage({
      text: initialEncrypted.encryptedMessage,
      cryptoKeys: initialEncrypted.encryptedKeys,
      initVector: initialEncrypted.iv
    });

    // Primera edición
    const firstEdit = await encryptEditedMessage({
      updatedText: secondVersionText,
      message: originalMessage,
      currentUserId: senderUser._id
    });

    expect(firstEdit.updatedIv).toBeDefined();
    expect(firstEdit.updatedIv).not.toBe(initialEncrypted.iv);

    // Segunda edición
    const secondEdit = await encryptEditedMessage({
      updatedText: finalVersionText,
      message: originalMessage,
      currentUserId: senderUser._id
    });

    // Construir el mensaje con su historial de cambios cifrado
    const messageWithHistory = buildMockMessage({
      text: secondEdit.updatedMsgEncrypted,
      initVector: secondEdit.updatedIv!,
      cryptoKeys: initialEncrypted.encryptedKeys,
      history: [
        {
          _id: "hist_1",
          previousContent: initialEncrypted.encryptedMessage,
          iv: initialEncrypted.iv,
          editedAt: new Date().toISOString()
        },
        {
          _id: "hist_2",
          previousContent: firstEdit.updatedMsgEncrypted || "",
          iv: firstEdit.updatedIv!,
          editedAt: new Date().toISOString()
        }
      ]
    });

    // Cambiar al contexto del destinatario para verificar que puede leer tanto el mensaje editado como todo su historial
    localStorage.setItem("privateKey", JSON.stringify(recipientKeys.privateKeyJWK));

    const decryptedEditedMsg = await decryptMessage(messageWithHistory, recipientId);
    expect(decryptedEditedMsg.text).toBe(finalVersionText);

    const msgWithDecryptedHistory = await decryptMsgHistory(messageWithHistory, recipientId);
    expect(msgWithDecryptedHistory.history).toHaveLength(2);
    expect(msgWithDecryptedHistory.history![0].previousContent).toBe(firstVersionText);
    expect(msgWithDecryptedHistory.history![1].previousContent).toBe(secondVersionText);
  });
});
