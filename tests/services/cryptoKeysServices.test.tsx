import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import { useCreateCryptoKeys, useGetUserCryptoKeys } from "@/services/cryptoKeys";
import { decryptPrivateKeyFromPin, protectPrivateKey } from "@/utils/encryptDecryptPrivateKey";
import { server } from "../mocks/server";
import { buildMockUser } from "../mocks/users/factories";
import { getCachedMockKeyPair } from "../mocks/cryptoKeys/factories";
import type { UserType } from "@/types/global";

/**
 * Suite de integración para los servicios y repositorio de claves criptográficas E2E
 * (`src/services/cryptoKeys/*` y `src/repositories/cryptoKeysRepository.ts`).
 *
 * Propósito:
 *   Validar la generación, cifrado con PIN vía PBKDF2/AES-GCM, almacenamiento en servidor
 *   y persistencia local en `localStorage` de las llaves RSA-OAEP del usuario, así como
 *   su recuperación y descifrado ante distintos estados de entrada y error.
 *
 * Qué evalúa y alcance (SUTs):
 *   - `useCreateCryptoKeys` + `createCryptoKeys`: generación del par RSA-2048, protección de la
 *     llave privada con el PIN, envío `POST /api/crypto-keys/store-user-keys?operation=create|update`,
 *     almacenamiento en `localStorage`, invalidación de `["chats", "all"]` y `["getCryptoKeys"]`,
 *     guarda cuando `user === null`, y `toast.error` sin persistencia local en fallo de servidor.
 *   - `useGetUserCryptoKeys` + `fetchUserCryptoKeys`: condición `enabled: !!user && pin.length === 6`,
 *     consulta `GET /api/crypto-keys/get-my-keys`, descifrado real con `decryptPrivateKeyFromPin`,
 *     persistencia en `localStorage`, política `retry: false` y propagación de errores por PIN incorrecto
 *     o fallo del servidor sin contaminar `localStorage`.
 */
describe("cryptoKeysServices (useCreateCryptoKeys & useGetUserCryptoKeys)", () => {
  let queryClient: QueryClient;

  const createWrapper = (client: QueryClient) => {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    localStorage.clear();
    // Configurar retry: 2 en el QueryClient por defecto para comprobar que
    // los hooks bajo prueba aplican su propia política (ej. retry: false en useGetUserCryptoKeys).
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: 2, retryDelay: 0 },
        mutations: { retry: false }
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    queryClient.clear();
  });

  describe("useCreateCryptoKeys & createCryptoKeys", () => {
    it("genera el par RSA, cifra la clave privada con el PIN, envía POST con operation=create|update, guarda en localStorage e invalida cachés", async () => {
      const user = buildMockUser();
      const capturedRequests: Array<{
        operation: string | null;
        body: {
          privateKey: string;
          publicKey: JsonWebKey;
          salt: string;
          iv: string;
        };
      }> = [];

      server.use(
        http.post("/api/crypto-keys/store-user-keys", async ({ request }) => {
          const url = new URL(request.url);
          const body = (await request.json()) as (typeof capturedRequests)[number]["body"];
          capturedRequests.push({
            operation: url.searchParams.get("operation"),
            body
          });

          return HttpResponse.json({
            publicKey: body.publicKey,
            privateKeyLock: {
              key: body.privateKey,
              salt: body.salt,
              iv: body.iv
            }
          });
        })
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const onSuccessCreate = vi.fn();

      // 1. Operación "create"
      const { result: createResult } = renderHook(
        () => useCreateCryptoKeys({ user, pin: "246810", operation: "create" }),
        { wrapper: createWrapper(queryClient) }
      );

      act(() => {
        createResult.current.mutate({ onSuccess: onSuccessCreate });
      });

      await waitFor(() => {
        expect(onSuccessCreate).toHaveBeenCalledTimes(1);
      });

      expect(capturedRequests).toHaveLength(1);
      expect(capturedRequests[0].operation).toBe("create");

      const createBody = capturedRequests[0].body;
      expect(createBody.publicKey.kty).toBe("RSA");
      expect(createBody.publicKey.d).toBeUndefined();

      const storedPublicKey = JSON.parse(localStorage.getItem("publicKey")!);
      const storedPrivateKey = JSON.parse(localStorage.getItem("privateKey")!);

      expect(storedPublicKey).toEqual(createBody.publicKey);
      // Verificar criptográficamente que el payload enviado al servidor se descifra con el mismo PIN
      const recoveredPrivateKey = await decryptPrivateKeyFromPin(
        createBody.privateKey,
        createBody.salt,
        createBody.iv,
        "246810"
      );
      expect(recoveredPrivateKey).toEqual(storedPrivateKey);

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["chats", "all"] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["getCryptoKeys"] });

      // 2. Operación "update"
      localStorage.clear();
      const onSuccessUpdate = vi.fn();
      const { result: updateResult } = renderHook(
        () => useCreateCryptoKeys({ user, pin: "135790", operation: "update" }),
        { wrapper: createWrapper(queryClient) }
      );

      act(() => {
        updateResult.current.mutate({ onSuccess: onSuccessUpdate });
      });

      await waitFor(() => {
        expect(onSuccessUpdate).toHaveBeenCalledTimes(1);
      });

      expect(capturedRequests).toHaveLength(2);
      expect(capturedRequests[1].operation).toBe("update");
      const recoveredUpdatedKey = await decryptPrivateKeyFromPin(
        capturedRequests[1].body.privateKey,
        capturedRequests[1].body.salt,
        capturedRequests[1].body.iv,
        "135790"
      );
      expect(recoveredUpdatedKey).toEqual(JSON.parse(localStorage.getItem("privateKey")!));
    });

    it("no genera claves, no llama al endpoint ni invoca callbacks si user es null", async () => {
      const postSpy = vi.fn();
      server.use(
        http.post("/api/crypto-keys/store-user-keys", () => {
          postSpy();
          return HttpResponse.json({});
        })
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const onSuccess = vi.fn();

      const { result } = renderHook(
        () => useCreateCryptoKeys({ user: null, pin: "123456", operation: "create" }),
        { wrapper: createWrapper(queryClient) }
      );

      act(() => {
        result.current.mutate({ onSuccess });
      });

      await waitFor(() => {
        expect(result.current.isPending).toBe(false);
      });

      expect(postSpy).not.toHaveBeenCalled();
      expect(localStorage.getItem("publicKey")).toBeNull();
      expect(localStorage.getItem("privateKey")).toBeNull();
      expect(invalidateSpy).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it("muestra toast de error, expone error y no persiste claves ni invalida cachés si falla POST /api/crypto-keys/store-user-keys", async () => {
      const user = buildMockUser();
      const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "");
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const onSuccess = vi.fn();

      server.use(
        http.post("/api/crypto-keys/store-user-keys", () => {
          return HttpResponse.json(
            { message: "Error interno del servidor" },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(
        () => useCreateCryptoKeys({ user, pin: "123456", operation: "create" }),
        { wrapper: createWrapper(queryClient) }
      );

      act(() => {
        result.current.mutate({ onSuccess });
      });

      await waitFor(() => {
        expect(toastErrorSpy).toHaveBeenCalledTimes(1);
      });

      expect(toastErrorSpy).toHaveBeenCalledWith(
        "Error al habilitar el cifrado de extremo a extremo. Inte\u0301ntalo de nuevo."
      );
      expect(result.current.error).toBeTruthy();
      expect(localStorage.getItem("publicKey")).toBeNull();
      expect(localStorage.getItem("privateKey")).toBeNull();
      expect(invalidateSpy).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();

      logSpy.mockRestore();
    });
  });

  describe("useGetUserCryptoKeys & fetchUserCryptoKeys", () => {
    it("permanece deshabilitado si user es null o pin no tiene exactamente 6 caracteres, y se ejecuta al cumplirse ambas condiciones", async () => {
      const user = buildMockUser();
      const { publicKeyJWK, privateKeyJWK } = await getCachedMockKeyPair("primary");
      const protectedLock = await protectPrivateKey(privateKeyJWK, "654321");

      let requestCount = 0;
      server.use(
        http.get("/api/crypto-keys/get-my-keys", () => {
          requestCount += 1;
          return HttpResponse.json({
            publicKey: publicKeyJWK,
            privateKeyLock: {
              key: protectedLock.encryptedKey,
              salt: protectedLock.salt,
              iv: protectedLock.iv
            }
          });
        })
      );

      const { result, rerender } = renderHook(
        ({ targetUser, pin }: { targetUser: UserType | null; pin: string }) =>
          useGetUserCryptoKeys({ user: targetUser, pin }),
        {
          initialProps: { targetUser: null as UserType | null, pin: "654321" },
          wrapper: createWrapper(queryClient)
        }
      );

      expect(result.current.isFetching).toBe(false);
      expect(requestCount).toBe(0);

      // PIN con menos de 6 dígitos
      rerender({ targetUser: user, pin: "65432" });
      expect(result.current.isFetching).toBe(false);
      expect(requestCount).toBe(0);

      // PIN con más de 6 dígitos
      rerender({ targetUser: user, pin: "6543210" });
      expect(result.current.isFetching).toBe(false);
      expect(requestCount).toBe(0);

      // Condición válida: user presente y pin.length === 6
      rerender({ targetUser: user, pin: "654321" });

      await waitFor(() => {
        expect(result.current.status).toBe("success");
      });

      expect(requestCount).toBe(1);
      expect(result.current.error).toBeNull();
      expect(result.current.isFetching).toBe(false);
      expect(JSON.parse(localStorage.getItem("publicKey")!)).toEqual(publicKeyJWK);
      expect(JSON.parse(localStorage.getItem("privateKey")!)).toEqual(privateKeyJWK);
    });

    it("falla sin reintentos (retry: false) con 'PIN incorrecto.' y no escribe en localStorage cuando el PIN no corresponde", async () => {
      const user = buildMockUser();
      const { publicKeyJWK, privateKeyJWK } = await getCachedMockKeyPair("primary");
      const protectedLock = await protectPrivateKey(privateKeyJWK, "654321");

      let requestCount = 0;
      server.use(
        http.get("/api/crypto-keys/get-my-keys", () => {
          requestCount += 1;
          return HttpResponse.json({
            publicKey: publicKeyJWK,
            privateKeyLock: {
              key: protectedLock.encryptedKey,
              salt: protectedLock.salt,
              iv: protectedLock.iv
            }
          });
        })
      );

      const { result } = renderHook(
        () => useGetUserCryptoKeys({ user, pin: "000000" }),
        { wrapper: createWrapper(queryClient) }
      );

      await waitFor(() => {
        expect(result.current.status).toBe("error");
      });

      expect(requestCount).toBe(1);
      expect(result.current.error?.message).toBe("PIN incorrecto.");
      expect(localStorage.getItem("publicKey")).toBeNull();
      expect(localStorage.getItem("privateKey")).toBeNull();
    });

    it("expone el error del servidor sin reintentos (retry: false) ni escritura en localStorage cuando GET /api/crypto-keys/get-my-keys falla", async () => {
      const user = buildMockUser();
      let requestCount = 0;

      server.use(
        http.get("/api/crypto-keys/get-my-keys", () => {
          requestCount += 1;
          return HttpResponse.json(
            { message: "Claves no encontradas" },
            { status: 404 }
          );
        })
      );

      const { result } = renderHook(
        () => useGetUserCryptoKeys({ user, pin: "123456" }),
        { wrapper: createWrapper(queryClient) }
      );

      await waitFor(() => {
        expect(result.current.status).toBe("error");
      });

      expect(requestCount).toBe(1);
      expect(result.current.error).toBeTruthy();
      expect(result.current.isFetching).toBe(false);
      expect(localStorage.getItem("publicKey")).toBeNull();
      expect(localStorage.getItem("privateKey")).toBeNull();
    });
  });
});
