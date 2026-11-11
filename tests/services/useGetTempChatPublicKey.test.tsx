import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { describe, it, expect } from "vitest";
import useGetTempChatPublicKey from "@/services/chats/useGetTempChatPublicKey";
import { server } from "../mocks/server";
import type { ChatType } from "@/types/global";

describe("useGetTempChatPublicKey", () => {
  const mockJwk: JsonWebKey = {
    kty: "RSA",
    e: "AQAB",
    n: "mock-modulus-value",
    alg: "RSA-OAEP-256",
    ext: true
  };

  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false
        }
      }
    });

    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  it("retorna un array tempChatPublicKey referencialmente estable entre re-renders", async () => {
    server.use(
      http.get("*/crypto-keys/get-user-public-key/:userId", () => {
        return HttpResponse.json({ data: mockJwk });
      })
    );

    const tempChat = {
      _id: "temp_user_123",
      type: "private",
      participants: []
    } as unknown as ChatType | null;

    const { result, rerender } = renderHook(
      ({ chat }: { chat: ChatType | null }) => useGetTempChatPublicKey(chat),
      {
        initialProps: { chat: tempChat },
        wrapper: createWrapper()
      }
    );

    await waitFor(() => {
      expect(result.current.tempChatPublicKey).toBeDefined();
    });

    const firstReference = result.current.tempChatPublicKey;
    expect(firstReference).toEqual([
      { publicKey: mockJwk, userId: "temp_user_123" }
    ]);

    // Re-renderiza con el mismo prop chat y verifica la
    // estabilidad referencial (previene loops infinitos)
    rerender({ chat: tempChat });
    expect(result.current.tempChatPublicKey).toBe(firstReference);

    // Cmbia el chat a null y verifica que no se lance un TypeError por una aserción de non-null.
    expect(() => rerender({ chat: null })).not.toThrow();
    expect(result.current.tempChatPublicKey).toBeUndefined();
  });
});