import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useTitleNotificationsCounter } from "@/hooks/useTitleNotificationsCounter";
import { useUnreadChats } from "@/hooks/useUnreadChats";
import { useUnseenNotifications } from "@/hooks/useUnseenNotifications";

/**
 * Suite unitaria para el hook de título dinámico del navegador
 * (`src/hooks/useTitleNotificationsCounter.ts`).
 *
 * Propósito:
 *   Validar que `document.title` refleje en tiempo real la suma combinada de notificaciones
 *   no vistas y chats no leídos, anteponiendo `"(N) "` cuando el total es mayor a 0 y
 *   restaurando el título limpio sin prefijo cuando vuelve a 0.
 *
 * Qué evalúa y alcance (SUT):
 *   - Suma combinada: `unseenNotifications + unreadChats.length` actualiza `document.title`
 *     a `"(N) SnapGram"` sin duplicar prefijos previos al cambiar el conteo.
 *   - Restablecimiento a 0: elimina el prefijo numérico dejando `"SnapGram"`.
 *   - Preservación de títulos personalizados: conserva el título base aunque ya incluya
 *     un contador anterior (ej. `"(9) Perfil - SnapGram"`).
 */
describe("useTitleNotificationsCounter", () => {
  const originalTitle = document.title;

  beforeEach(() => {
    document.title = "SnapGram";
    useUnseenNotifications.setState({ unseenNotifications: 0 });
    useUnreadChats.setState({ unreadChats: [] });
  });

  afterEach(() => {
    cleanup();
    document.title = originalTitle;
    useUnseenNotifications.setState({ unseenNotifications: 0 });
    useUnreadChats.setState({ unreadChats: [] });
  });

  it("actualiza document.title sumando unseenNotifications + unreadChats.length y elimina el prefijo al volver a 0", () => {
    renderHook(() => useTitleNotificationsCounter());

    expect(document.title).toBe("SnapGram");

    act(() => {
      useUnseenNotifications.setState({ unseenNotifications: 3 });
    });
    expect(document.title).toBe("(3) SnapGram");

    act(() => {
      useUnreadChats.setState({ unreadChats: ["chat_1", "chat_2"] });
    });
    expect(document.title).toBe("(5) SnapGram");

    act(() => {
      useUnseenNotifications.setState({ unseenNotifications: 0 });
    });
    expect(document.title).toBe("(2) SnapGram");

    act(() => {
      useUnreadChats.setState({ unreadChats: [] });
    });
    expect(document.title).toBe("SnapGram");
  });

  it("reemplaza un contador preexistente preservando el texto base del título", () => {
    document.title = "(9) Perfil - SnapGram";

    renderHook(() => useTitleNotificationsCounter());
    expect(document.title).toBe("Perfil - SnapGram");

    act(() => {
      useUnseenNotifications.setState({ unseenNotifications: 1 });
      useUnreadChats.setState({ unreadChats: ["chat_x"] });
    });
    expect(document.title).toBe("(2) Perfil - SnapGram");

    act(() => {
      useUnseenNotifications.setState({ unseenNotifications: 0 });
      useUnreadChats.setState({ unreadChats: [] });
    });
    expect(document.title).toBe("Perfil - SnapGram");
  });
});
