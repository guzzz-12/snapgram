import { vi } from "vitest";
import type { ServerEvents } from "@/types/socketTypes";

type Listener = (...args: any[]) => void;

export const createSocketMock = () => {
  const listeners = new Map<string, Set<Listener>>();

  const on = vi.fn((event: string, listener: Listener) => {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event)!.add(listener);
    return mockSocket;
  });

  const off = vi.fn((event: string, listener?: Listener) => {
    if (!listener) {
      listeners.delete(event);
    } else {
      listeners.get(event)?.delete(listener);
    }
    return mockSocket;
  });

  const emit = vi.fn();
  const connect = vi.fn();
  const disconnect = vi.fn();

  const emitServerEvent = <E extends keyof ServerEvents>(
    event: E,
    ...args: Parameters<ServerEvents[E]>
  ) => {
    const eventListeners = listeners.get(event as string);
    if (!eventListeners) return;

    for (const listener of [...eventListeners]) {
      listener(...args);
    }
  };

  const reset = () => {
    listeners.clear();
    on.mockClear();
    off.mockClear();
    emit.mockClear();
    connect.mockClear();
    disconnect.mockClear();
  };

  const getListenerCount = (event: string) => listeners.get(event)?.size ?? 0;

  const mockSocket = {
    on,
    off,
    emit,
    connect,
    disconnect,
    auth: {} as Record<string, unknown>,
    connected: false,
    emitServerEvent,
    reset,
    getListenerCount
  };

  return mockSocket;
};

export type SocketMock = ReturnType<typeof createSocketMock>;
