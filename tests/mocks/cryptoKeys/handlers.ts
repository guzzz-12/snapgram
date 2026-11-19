import { http, HttpResponse } from "msw";
import { protectPrivateKey } from "@/utils/encryptDecryptPrivateKey";
import { getCachedMockKeyPair } from "./factories";

export const handlers = [
  http.post("/api/crypto-keys/store-user-keys", async ({ request }) => {
    const body = (await request.json()) as {
      privateKey: string;
      publicKey: JsonWebKey;
      salt: string;
      iv: string;
    };

    return HttpResponse.json({
      publicKey: body.publicKey,
      privateKeyLock: {
        key: body.privateKey,
        salt: body.salt,
        iv: body.iv
      }
    });
  }),

  http.get("/api/crypto-keys/get-my-keys", async () => {
    const { publicKeyJWK, privateKeyJWK } = await getCachedMockKeyPair("primary");
    const { encryptedKey, salt, iv } = await protectPrivateKey(privateKeyJWK, "123456");

    return HttpResponse.json({
      publicKey: publicKeyJWK,
      privateKeyLock: {
        key: encryptedKey,
        salt,
        iv
      }
    });
  }),

  http.get("*/crypto-keys/get-user-public-key/:userId", async () => {
    const { publicKeyJWK } = await getCachedMockKeyPair("primary");

    return HttpResponse.json({
      data: publicKeyJWK
    });
  }),

  http.get("/api/crypto-keys/get-recipients-public-keys/:chatId", async () => {
    const { publicKeyJWK } = await getCachedMockKeyPair("primary");

    return HttpResponse.json({
      publicKeys: [
        {
          userId: "usr_recipient_mock",
          publicKey: publicKeyJWK
        }
      ]
    });
  })
];
