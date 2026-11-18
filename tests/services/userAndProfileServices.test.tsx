import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import { AuthContext, type AuthContext as AuthContextType } from "@/providers/AuthProvider";
import { useFollowOrUnfollowUser } from "@/services/profile";
import {
  useBlockUser,
  useUserProfileUpdate,
  useDisableAccount,
  useReactivateAccount
} from "@/services/user";
import { server } from "../mocks/server";
import { buildMockUser } from "../mocks/users/factories";

/**
 * Suite de integración para los servicios de perfil, usuario y bloqueos
 * (`src/services/profile/useFollowOrUnfollowUser.ts` y `src/services/user/*`).
 *
 * Propósito:
 *   Validar las mutaciones críticas de relaciones sociales, bloqueo/desbloqueo de usuarios,
 *   edición del perfil y ciclo de vida de la cuenta (deshabilitación con cierre diferido de
 *   sesión y reactivación), verificando contratos HTTP, invalidaciones exactas de caché,
 *   guardas defensivas y manejo de errores.
 *
 * Qué evalúa y alcance (SUTs):
 *   - `useFollowOrUnfollowUser`: envío de `{ userId }` a `POST /api/follows/follow-or-unfollow`,
 *     invalidación de `["user", clerkId]`, `["followers"]` y `["following"]`, guarda cuando
 *     `currentUserClerkId` es nulo y `toast.error` ante fallos de API.
 *   - `useBlockUser`: envío de `{ blockedUserId }` a `PUT /api/block`, toasts diferenciados
 *     `"Bloqueaste a <Nombre>"` / `"Desbloqueaste a <Nombre>"`, invalidación de `["blocked-users"]`,
 *     `["user", clerkId]` e invalidación condicional de `["chat", chatId]` solo cuando existe `chatId`,
 *     guarda con `blockedUser: null` y manejo de errores.
 *   - `useUserProfileUpdate`: envío JSON a `PUT /api/users/update-user`, invalidación en paralelo
 *     de `["user", userId]` y `["posts", userId]`, callback `onSuccess` y `toast.error` en fallos.
 *   - `useDisableAccount`: envío `PUT /api/users/disable-account`, toast de confirmación,
 *     ejecución diferida de `signOut({ redirectUrl: "/" })` exactamente a los 1000ms y no ejecución
 *     ante error de servidor.
 *   - `useReactivateAccount`: envío `PUT /api/users/reactivate-account`, invalidación de `["me"]`,
 *     toast de confirmación y manejo de errores.
 */
describe("userAndProfileServices (useFollowOrUnfollowUser, useBlockUser, useUserProfileUpdate, useDisableAccount, useReactivateAccount)", () => {
  let queryClient: QueryClient;
  let signOutMock: ReturnType<typeof vi.fn>;

  const createWrapper = (client: QueryClient, customSignOut = signOutMock) => {
    return ({ children }: { children: ReactNode }) => (
      <AuthContext.Provider
        value={{
          userId: "clerk_current_1",
          isLoaded: true,
          isSignedIn: true,
          signOut: customSignOut as unknown as AuthContextType["signOut"],
          getToken: vi.fn().mockResolvedValue("mock-jwt-token")
        }}
      >
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </AuthContext.Provider>
    );
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    signOutMock = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    queryClient.clear();
  });

  describe("useFollowOrUnfollowUser", () => {
    it("envía POST /api/follows/follow-or-unfollow con { userId } e invalida ['user', clerkId], ['followers'] y ['following']", async () => {
      let capturedBody: { userId?: string } | null = null;
      let requestCount = 0;

      server.use(
        http.post("/api/follows/follow-or-unfollow", async ({ request }) => {
          requestCount += 1;
          capturedBody = (await request.json()) as { userId?: string };

          return HttpResponse.json({
            message: "Seguimiento actualizado"
          });
        })
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "toast-id");

      const { result } = renderHook(
        () => useFollowOrUnfollowUser("user_target_123", "clerk_current_1"),
        { wrapper: createWrapper(queryClient) }
      );

      act(() => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledTimes(3);
      });

      expect(requestCount).toBe(1);
      expect(capturedBody).toEqual({ userId: "user_target_123" });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["user", "clerk_current_1"]
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["followers"]
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["following"]
      });
      expect(toastErrorSpy).not.toHaveBeenCalled();
    });

    it("no realiza ninguna petición HTTP si currentUserClerkId es null", async () => {
      let requestCount = 0;

      server.use(
        http.post("/api/follows/follow-or-unfollow", () => {
          requestCount += 1;
          return HttpResponse.json({ message: "ok" });
        })
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(
        () => useFollowOrUnfollowUser("user_target_123", null),
        { wrapper: createWrapper(queryClient) }
      );

      act(() => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalled();
      });

      expect(requestCount).toBe(0);
    });

    it("muestra toast.error con el mensaje del backend y no invalida queries si falla la petición", async () => {
      server.use(
        http.post("/api/follows/follow-or-unfollow", () => {
          return HttpResponse.json(
            { message: "No se pudo actualizar el seguimiento" },
            { status: 500 }
          );
        })
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "toast-id");

      const { result } = renderHook(
        () => useFollowOrUnfollowUser("user_target_123", "clerk_current_1"),
        { wrapper: createWrapper(queryClient) }
      );

      act(() => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(toastErrorSpy).toHaveBeenCalledTimes(1);
      });

      expect(toastErrorSpy).toHaveBeenCalledWith("No se pudo actualizar el seguimiento");
      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });

  describe("useBlockUser", () => {
    it("envía PUT /api/block al bloquear, muestra toast con el primer nombre, invalida ['blocked-users'], ['user', clerkId] y ['chat', chatId], y ejecuta onSuccess", async () => {
      const targetUser = buildMockUser({
        _id: "usr_target_1",
        clerkId: "clerk_target_1",
        fullName: "Carlos Mendoza"
      });

      let capturedBody: { blockedUserId?: string } | null = null;

      server.use(
        http.put("/api/block", async ({ request }) => {
          capturedBody = (await request.json()) as { blockedUserId?: string };

          return HttpResponse.json({
            data: {
              user: targetUser,
              operation: "block" as const,
              chatId: "chat_abc_99"
            }
          });
        })
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const toastSuccessSpy = vi.spyOn(toast, "success").mockImplementation(() => "toast-id");
      const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "toast-id");
      const onSuccess = vi.fn();

      const { result } = renderHook(
        () => useBlockUser({ blockedUser: targetUser, onSuccess }),
        { wrapper: createWrapper(queryClient) }
      );

      act(() => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });

      expect(capturedBody).toEqual({ blockedUserId: "usr_target_1" });
      expect(toastSuccessSpy).toHaveBeenCalledTimes(1);
      expect(toastSuccessSpy).toHaveBeenCalledWith("Bloqueaste a Carlos");

      expect(invalidateSpy).toHaveBeenCalledTimes(3);
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["blocked-users"] });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["user", "clerk_target_1"]
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["chat", "chat_abc_99"]
      });
      expect(toastErrorSpy).not.toHaveBeenCalled();
    });

    it("al desbloquear con chatId null muestra 'Desbloqueaste a <Nombre>' e invalida solo ['blocked-users'] y ['user', clerkId] sin invalidar ['chat', ...]", async () => {
      const targetUser = buildMockUser({
        _id: "usr_target_2",
        clerkId: "clerk_target_2",
        fullName: "Ana Torres"
      });

      server.use(
        http.put("/api/block", () => {
          return HttpResponse.json({
            data: {
              user: targetUser,
              operation: "unblock" as const,
              chatId: null
            }
          });
        })
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const toastSuccessSpy = vi.spyOn(toast, "success").mockImplementation(() => "toast-id");
      const onSuccess = vi.fn();

      const { result } = renderHook(
        () => useBlockUser({ blockedUser: targetUser, onSuccess }),
        { wrapper: createWrapper(queryClient) }
      );

      act(() => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });

      expect(toastSuccessSpy).toHaveBeenCalledTimes(1);
      expect(toastSuccessSpy).toHaveBeenCalledWith("Desbloqueaste a Ana");

      expect(invalidateSpy).toHaveBeenCalledTimes(2);
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["blocked-users"] });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["user", "clerk_target_2"]
      });
    });

    it("no envía petición HTTP ni muestra toast.success si blockedUser es null", async () => {
      let requestCount = 0;

      server.use(
        http.put("/api/block", () => {
          requestCount += 1;
          return HttpResponse.json({ data: {} });
        })
      );

      const toastSuccessSpy = vi.spyOn(toast, "success").mockImplementation(() => "toast-id");
      const onSuccess = vi.fn();

      const { result } = renderHook(
        () => useBlockUser({ blockedUser: null, onSuccess }),
        { wrapper: createWrapper(queryClient) }
      );

      act(() => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });

      expect(requestCount).toBe(0);
      expect(toastSuccessSpy).not.toHaveBeenCalled();
    });

    it("muestra toast.error y evita toast.success, invalidaciones y onSuccess si falla PUT /api/block", async () => {
      const targetUser = buildMockUser({ _id: "usr_self" });

      server.use(
        http.put("/api/block", () => {
          return HttpResponse.json(
            { message: "No puedes bloquearte a ti mismo" },
            { status: 400 }
          );
        })
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const toastSuccessSpy = vi.spyOn(toast, "success").mockImplementation(() => "toast-id");
      const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "toast-id");
      const onSuccess = vi.fn();

      const { result } = renderHook(
        () => useBlockUser({ blockedUser: targetUser, onSuccess }),
        { wrapper: createWrapper(queryClient) }
      );

      act(() => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(toastErrorSpy).toHaveBeenCalledTimes(1);
      });

      expect(toastErrorSpy).toHaveBeenCalledWith("No puedes bloquearte a ti mismo");
      expect(toastSuccessSpy).not.toHaveBeenCalled();
      expect(invalidateSpy).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe("useUserProfileUpdate", () => {
    it("envía JSON a PUT /api/users/update-user, invalida en paralelo ['user', userId] y ['posts', userId] y ejecuta onSuccess", async () => {
      const updatedUser = buildMockUser({
        clerkId: "clerk_profile_42",
        fullName: "Laura Gómez",
        username: "laura_g",
        bio: "Desarrolladora frontend"
      });

      let capturedContentType: string | null = null;
      let capturedBody: { fullName: string; username: string; bio?: string } | null = null;

      server.use(
        http.put("/api/users/update-user", async ({ request }) => {
          capturedContentType = request.headers.get("content-type");
          capturedBody = (await request.json()) as {
            fullName: string;
            username: string;
            bio?: string;
          };

          return HttpResponse.json({ data: updatedUser });
        })
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "toast-id");
      const onSuccess = vi.fn();

      const { result } = renderHook(
        () => useUserProfileUpdate({ userId: "clerk_profile_42", onSuccess }),
        { wrapper: createWrapper(queryClient) }
      );

      act(() => {
        result.current.mutate({
          fullName: "Laura Gómez",
          username: "laura_g",
          bio: "Desarrolladora frontend"
        });
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });

      expect(capturedContentType).toMatch(/application\/json/i);
      expect(capturedBody).toEqual({
        fullName: "Laura Gómez",
        username: "laura_g",
        bio: "Desarrolladora frontend"
      });

      expect(invalidateSpy).toHaveBeenCalledTimes(2);
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["user", "clerk_profile_42"]
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["posts", "clerk_profile_42"]
      });
      expect(result.current.data).toEqual({ data: updatedUser });
      expect(toastErrorSpy).not.toHaveBeenCalled();
    });

    it("muestra toast.error y no invalida queries ni llama onSuccess ante error de API", async () => {
      server.use(
        http.put("/api/users/update-user", () => {
          return HttpResponse.json(
            { message: "El nombre de usuario ya está en uso" },
            { status: 409 }
          );
        })
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "toast-id");
      const onSuccess = vi.fn();

      const { result } = renderHook(
        () => useUserProfileUpdate({ userId: "clerk_profile_42", onSuccess }),
        { wrapper: createWrapper(queryClient) }
      );

      act(() => {
        result.current.mutate({
          fullName: "Laura Gómez",
          username: "duplicado",
          bio: ""
        });
      });

      await waitFor(() => {
        expect(toastErrorSpy).toHaveBeenCalledTimes(1);
      });

      expect(toastErrorSpy).toHaveBeenCalledWith("El nombre de usuario ya está en uso");
      expect(invalidateSpy).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe("useDisableAccount", () => {
    it("envía PUT /api/users/disable-account, muestra toast.success y ejecuta signOut({ redirectUrl: '/' }) exactamente a los 1000ms", async () => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      let requestCount = 0;

      server.use(
        http.put("/api/users/disable-account", () => {
          requestCount += 1;
          return HttpResponse.json({ message: "Cuenta deshabilitada" });
        })
      );

      let resolveToast!: () => void;
      const toastCalled = new Promise<void>((resolve) => {
        resolveToast = resolve;
      });

      const toastSuccessSpy = vi
        .spyOn(toast, "success")
        .mockImplementation(() => {
          resolveToast();
          return "toast-id";
        });
      const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "toast-id");

      const { result } = renderHook(() => useDisableAccount(), {
        wrapper: createWrapper(queryClient)
      });

      act(() => {
        result.current.disableAccount();
      });

      await toastCalled;

      expect(requestCount).toBe(1);
      expect(toastSuccessSpy).toHaveBeenCalledTimes(1);
      expect(toastSuccessSpy).toHaveBeenCalledWith(
        "Tu cuenta ha sido deshabilitada correctamente"
      );
      expect(toastErrorSpy).not.toHaveBeenCalled();
      expect(signOutMock).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(999);
      });
      expect(signOutMock).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(signOutMock).toHaveBeenCalledTimes(1);
      expect(signOutMock).toHaveBeenCalledWith({ redirectUrl: "/" });
    });

    it("muestra toast.error y no programa signOut ni muestra toast.success si falla PUT /api/users/disable-account", async () => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      server.use(
        http.put("/api/users/disable-account", () => {
          return HttpResponse.json(
            { message: "No se pudo deshabilitar la cuenta" },
            { status: 500 }
          );
        })
      );

      let resolveErrorToast!: () => void;
      const errorToastCalled = new Promise<void>((resolve) => {
        resolveErrorToast = resolve;
      });

      const toastSuccessSpy = vi.spyOn(toast, "success").mockImplementation(() => "toast-id");
      const toastErrorSpy = vi
        .spyOn(toast, "error")
        .mockImplementation(() => {
          resolveErrorToast();
          return "toast-id";
        });

      const { result } = renderHook(() => useDisableAccount(), {
        wrapper: createWrapper(queryClient)
      });

      act(() => {
        result.current.disableAccount();
      });

      await errorToastCalled;

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(toastErrorSpy).toHaveBeenCalledTimes(1);
      expect(toastErrorSpy).toHaveBeenCalledWith("No se pudo deshabilitar la cuenta");
      expect(toastSuccessSpy).not.toHaveBeenCalled();
      expect(signOutMock).not.toHaveBeenCalled();
    });
  });

  describe("useReactivateAccount", () => {
    it("envía PUT /api/users/reactivate-account, invalida ['me'] y muestra toast.success", async () => {
      let requestCount = 0;

      server.use(
        http.put("/api/users/reactivate-account", () => {
          requestCount += 1;
          return HttpResponse.json({ message: "Cuenta reactivada" });
        })
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const toastSuccessSpy = vi.spyOn(toast, "success").mockImplementation(() => "toast-id");
      const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "toast-id");

      const { result } = renderHook(() => useReactivateAccount(), {
        wrapper: createWrapper(queryClient)
      });

      act(() => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(toastSuccessSpy).toHaveBeenCalledTimes(1);
      });

      expect(requestCount).toBe(1);
      expect(invalidateSpy).toHaveBeenCalledTimes(1);
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["me"] });
      expect(toastSuccessSpy).toHaveBeenCalledWith(
        "Tu cuenta ha sido reactivada correctamente."
      );
      expect(toastErrorSpy).not.toHaveBeenCalled();
    });

    it("muestra toast.error y no invalida ['me'] ni llama toast.success si falla la reactivación", async () => {
      server.use(
        http.put("/api/users/reactivate-account", () => {
          return HttpResponse.json(
            { message: "Error al reactivar la cuenta" },
            { status: 500 }
          );
        })
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const toastSuccessSpy = vi.spyOn(toast, "success").mockImplementation(() => "toast-id");
      const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "toast-id");

      const { result } = renderHook(() => useReactivateAccount(), {
        wrapper: createWrapper(queryClient)
      });

      act(() => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(toastErrorSpy).toHaveBeenCalledTimes(1);
      });

      expect(toastErrorSpy).toHaveBeenCalledWith("Error al reactivar la cuenta");
      expect(invalidateSpy).not.toHaveBeenCalled();
      expect(toastSuccessSpy).not.toHaveBeenCalled();
    });
  });
});
