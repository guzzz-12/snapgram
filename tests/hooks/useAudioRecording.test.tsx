import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { toast } from "sonner";
import { useAudioRecording } from "@/hooks/useAudioRecording";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { socket } from "@/utils/socket";
import { buildMockUser } from "../mocks/users/factories";
import type { SocketMock } from "../mocks/socket/socketMock";

vi.mock("@/utils/socket", async () => {
  const { createSocketMock } = await import("../mocks/socket/socketMock");
  return { socket: createSocketMock() };
});

const socketMock = socket as unknown as SocketMock;

type MockTrack = { stop: ReturnType<typeof vi.fn> };

const createMockStream = () => {
  const track: MockTrack = { stop: vi.fn() };
  const stream = {
    getTracks: vi.fn(() => [track]),
    getAudioTracks: vi.fn(() => [track])
  } as unknown as MediaStream;
  return { stream, track };
};

/**
 * Suite unitaria para el hook de grabación de notas de voz
 * (`src/hooks/useAudioRecording.ts`).
 *
 * Propósito:
 *   Validar el ciclo completo de grabación con `MediaDevices`/`MediaRecorder`, el formateo
 *   del temporizador (`MM:SS`), la resiliencia ante denegación de permisos o fallos de hardware,
 *   la limpieza de tracks/estado en `clearRecording`, y la prevención de fugas por concurrencia
 *   o desmontaje prematuro.
 *
 * Qué evalúa y alcance (SUT):
 *   - Ciclo completo de grabación: registra `onstart`/`ondataavailable`/`onstop` antes de
 *     llamar a `recorder.start()`, emite `"recordingAudio"`, avanza `recordingTime` (`MM:SS`),
 *     detiene tracks y genera un `File` `.webm` (`audio/webm;codecs=opus`) ignorando chunks vacíos,
 *     emitiendo `"stoppedRecordingAudio"` y tolerando llamadas repetidas a `stopRecording`.
 *   - Resiliencia ante errores: ante `NotAllowedError`, `NotReadableError` o fallo al instanciar
 *     `MediaRecorder`, notifica por `toast.error`, detiene tracks adquiridos, evita dejar
 *     `isRecording` bloqueado en `true` y emite `"stoppedRecordingAudio"`.
 *   - `clearRecording`: detiene los tracks del `MediaStream` y el `MediaRecorder` activo,
 *     impide que `onstop` restaure un archivo cancelado, reinicia `recordingTime` a `"00:00"`
 *     y limpia `recordedFile`.
 *   - Concurrencia y desmontaje: bloquea inicios duplicados mientras `getUserMedia` está
 *     pendiente, libera el stream si el hook se desmonta antes de resolverse el permiso, y
 *     detiene tracks + emite `"stoppedRecordingAudio"` si se desmonta durante una grabación.
 */
describe("useAudioRecording", () => {
  const OriginalMediaRecorder = globalThis.MediaRecorder;
  const OriginalMediaDevices = navigator.mediaDevices;

  const currentUser = buildMockUser({
    _id: "usr_audio_1",
    clerkId: "clerk_audio_1",
    fullName: "Mateo Audio",
    username: "mateo_a"
  });

  const routerWrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={["/messages/chat_audio_42"]}>
      <Routes>
        <Route path="/messages/:chatId" element={children} />
      </Routes>
    </MemoryRouter>
  );

  let mockGetUserMedia: ReturnType<typeof vi.fn>;
  let lastRecorder: FakeMediaRecorder | null = null;
  let recorderConstructorCalls = 0;
  let throwOnMediaRecorder = false;

  class FakeMediaRecorder {
    state: RecordingState = "inactive";
    onstart: (() => void) | null = null;
    ondataavailable: ((e: { data: Blob }) => void) | null = null;
    onstop: ((e: Event) => void) | null = null;
    onerror: ((e: Event) => void) | null = null;
    stream: MediaStream;

    start = vi.fn(() => {
      if (this.state !== "inactive") {
        throw new DOMException("InvalidStateError", "InvalidStateError");
      }
      this.state = "recording";
      // Disparar onstart sincrónicamente para verificar que los handlers se registran ANTES de start()
      this.onstart?.();
    });

    stop = vi.fn(() => {
      if (this.state === "inactive") {
        throw new DOMException("InvalidStateError", "InvalidStateError");
      }
      this.state = "inactive";
      // En navegadores reales ondataavailable/onstop se disparan asincrónicamente tras stop()
      queueMicrotask(() => {
        this.ondataavailable?.({ data: new Blob([], { type: "audio/webm" }) });
        this.ondataavailable?.({ data: new Blob(["audio-bytes"], { type: "audio/webm" }) });
        this.onstop?.(new Event("stop"));
      });
    });

    constructor(stream: MediaStream) {
      recorderConstructorCalls += 1;
      if (throwOnMediaRecorder) {
        throw new Error("Unsupported MediaRecorder");
      }
      this.stream = stream;
      lastRecorder = this;
    }
  }

  beforeEach(() => {
    vi.useFakeTimers();
    socketMock.reset();
    lastRecorder = null;
    recorderConstructorCalls = 0;
    throwOnMediaRecorder = false;

    useCurrentUser.setState({ user: currentUser, loadingUser: false });

    mockGetUserMedia = vi.fn();
    Object.defineProperty(navigator, "mediaDevices", {
      value: { getUserMedia: mockGetUserMedia },
      configurable: true
    });
    globalThis.MediaRecorder =
      FakeMediaRecorder as unknown as typeof MediaRecorder;
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    socketMock.reset();
    useCurrentUser.setState({ user: null, loadingUser: false });
    Object.defineProperty(navigator, "mediaDevices", {
      value: OriginalMediaDevices,
      configurable: true
    });
    globalThis.MediaRecorder = OriginalMediaRecorder;
  });

  it("inicia grabación con handlers registrados antes de start(), avanza recordingTime en MM:SS, detiene tracks y genera el File .webm", async () => {
    const { stream, track } = createMockStream();
    mockGetUserMedia.mockResolvedValue(stream);

    const { result } = renderHook(() => useAudioRecording(), {
      wrapper: routerWrapper
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.recordingTime).toBe("00:00");
    expect(result.current.recordedFile).toBeNull();

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(true);
    expect(socketMock.emit).toHaveBeenCalledWith("recordingAudio", {
      chatId: "chat_audio_42",
      user: currentUser
    });

    // Avanzar 65 segundos -> 01:05
    act(() => {
      vi.advanceTimersByTime(65_000);
    });
    expect(result.current.recordingTime).toBe("01:05");

    // Dos llamadas seguidas a stopRecording antes de resolverse onstop no deben lanzar InvalidStateError
    await act(async () => {
      result.current.stopRecording();
      result.current.stopRecording();
      await Promise.resolve();
    });

    expect(lastRecorder!.stop).toHaveBeenCalledTimes(1);
    expect(track.stop).toHaveBeenCalled();
    expect(result.current.isRecording).toBe(false);
    expect(result.current.recordedFile).toBeInstanceOf(File);
    expect(result.current.recordedFile?.name).toMatch(/\.webm$/);
    expect(result.current.recordedFile?.type).toBe("audio/webm;codecs=opus");
    expect(result.current.recordedFile?.size).toBe("audio-bytes".length);
    expect(socketMock.emit).toHaveBeenCalledWith("stoppedRecordingAudio", {
      chatId: "chat_audio_42",
      user: currentUser
    });
  });

  it("maneja NotAllowedError, NotReadableError y fallo de MediaRecorder sin bloquear isRecording, liberando tracks y emitiendo stoppedRecordingAudio", async () => {
    const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "");

    const { result } = renderHook(() => useAudioRecording(), {
      wrapper: routerWrapper
    });

    // 1. NotAllowedError (permiso denegado)
    mockGetUserMedia.mockRejectedValueOnce(
      new DOMException("Permission denied", "NotAllowedError")
    );

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(false);
    expect(toastErrorSpy).toHaveBeenCalledWith("Permiso denegado para grabar audio.");
    expect(socketMock.emit).toHaveBeenCalledWith("stoppedRecordingAudio", {
      chatId: "chat_audio_42",
      user: currentUser
    });

    socketMock.emit.mockClear();
    toastErrorSpy.mockClear();

    // 2. NotReadableError (micrófono no disponible)
    mockGetUserMedia.mockRejectedValueOnce(
      new DOMException("Device busy", "NotReadableError")
    );

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(false);
    expect(toastErrorSpy).toHaveBeenCalledWith(
      "Micrófono no disponible o desconectado."
    );
    expect(socketMock.emit).toHaveBeenCalledWith("stoppedRecordingAudio", {
      chatId: "chat_audio_42",
      user: currentUser
    });

    socketMock.emit.mockClear();
    toastErrorSpy.mockClear();

    // 3. Fallo en constructor de MediaRecorder tras obtener el stream -> debe detener tracks del stream adquirido
    const { stream, track } = createMockStream();
    mockGetUserMedia.mockResolvedValueOnce(stream);
    throwOnMediaRecorder = true;

    await act(async () => {
      await result.current.startRecording();
    });

    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(result.current.isRecording).toBe(false);
    expect(toastErrorSpy).toHaveBeenCalledWith("Error iniciando la grabación de audio.");
    expect(socketMock.emit).toHaveBeenCalledWith("stoppedRecordingAudio", {
      chatId: "chat_audio_42",
      user: currentUser
    });
  });

  it("clearRecording detiene los tracks y el recorder activo sin generar recordedFile, y reinicia recordingTime a 00:00", async () => {
    const { stream: stream1, track: track1 } = createMockStream();
    mockGetUserMedia.mockResolvedValueOnce(stream1);

    const { result } = renderHook(() => useAudioRecording(), {
      wrapper: routerWrapper
    });

    // 1. Limpiar una grabación ya finalizada
    await act(async () => {
      await result.current.startRecording();
    });
    await act(async () => {
      vi.advanceTimersByTime(3_000);
      result.current.stopRecording();
      await Promise.resolve();
    });
    expect(result.current.recordingTime).toBe("00:03");
    expect(result.current.recordedFile).not.toBeNull();

    act(() => {
      result.current.clearRecording();
    });
    expect(result.current.recordedFile).toBeNull();
    expect(result.current.recordingTime).toBe("00:00");
    expect(track1.stop).toHaveBeenCalled();

    // 2. Limpiar en medio de una grabación activa: detiene tracks, cancela generación de archivo (incluso tras onstop asíncrono) y emite stoppedRecordingAudio
    const { stream: stream2, track: track2 } = createMockStream();
    mockGetUserMedia.mockResolvedValueOnce(stream2);
    socketMock.emit.mockClear();

    await act(async () => {
      await result.current.startRecording();
    });
    act(() => {
      vi.advanceTimersByTime(4_000);
    });
    expect(result.current.isRecording).toBe(true);
    expect(result.current.recordingTime).toBe("00:04");

    await act(async () => {
      result.current.clearRecording();
      await Promise.resolve();
    });

    expect(track2.stop).toHaveBeenCalled();
    expect(result.current.isRecording).toBe(false);
    expect(result.current.recordingTime).toBe("00:00");
    expect(result.current.recordedFile).toBeNull();
    expect(socketMock.emit).toHaveBeenCalledWith("stoppedRecordingAudio", {
      chatId: "chat_audio_42",
      user: currentUser
    });
  });

  it("previene doble inicio concurrente y libera tracks/emite stoppedRecordingAudio ante desmontaje prematuro", async () => {
    // 1. Doble llamada concurrente mientras getUserMedia está pendiente + desmontaje antes de resolver
    let resolvePendingStream!: (stream: MediaStream) => void;
    const pendingPromise = new Promise<MediaStream>((resolve) => {
      resolvePendingStream = resolve;
    });
    mockGetUserMedia.mockReturnValueOnce(pendingPromise);

    const first = renderHook(() => useAudioRecording(), {
      wrapper: routerWrapper
    });

    act(() => {
      void first.result.current.startRecording();
      void first.result.current.startRecording();
    });

    expect(mockGetUserMedia).toHaveBeenCalledTimes(1);

    // Desmontar antes de que el usuario acepte el permiso de micrófono
    first.unmount();

    const { stream: lateStream, track: lateTrack } = createMockStream();
    await act(async () => {
      resolvePendingStream(lateStream);
      await pendingPromise;
    });

    expect(lateTrack.stop).toHaveBeenCalledTimes(1);
    expect(recorderConstructorCalls).toBe(0);

    // 2. Desmontar mientras está grabando activamente detiene tracks y notifica stoppedRecordingAudio
    const { stream: activeStream, track: activeTrack } = createMockStream();
    mockGetUserMedia.mockResolvedValueOnce(activeStream);
    socketMock.emit.mockClear();

    const second = renderHook(() => useAudioRecording(), {
      wrapper: routerWrapper
    });

    await act(async () => {
      await second.result.current.startRecording();
    });
    expect(second.result.current.isRecording).toBe(true);

    second.unmount();

    expect(activeTrack.stop).toHaveBeenCalled();
    expect(socketMock.emit).toHaveBeenCalledWith("stoppedRecordingAudio", {
      chatId: "chat_audio_42",
      user: currentUser
    });
  });
});
