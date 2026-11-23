import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import ChatInput from "@/components/chat/ChatInput";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTemporaryChat } from "@/hooks/useTemporaryChat";
import { useUsersTyping } from "@/hooks/useUsersTyping";
import { useUsersRecordingAudio } from "@/hooks/useUsersRecordingAudio";
import { imageProcessor } from "@/utils/imageCompressor";
import { filesUploader } from "@/utils/filesUploader";
import { socket } from "@/utils/socket";
import type { PublicKeysType } from "@/repositories/chatsRepository";
import type { ChatType } from "@/types/global";
import { server } from "../../mocks/server";
import { buildMockUser } from "../../mocks/users/factories";
import { buildMockChat, buildMockMessage } from "../../mocks/chats/factories";
import { getCachedMockKeyPair } from "../../mocks/cryptoKeys/factories";
import type { SocketMock } from "../../mocks/socket/socketMock";

vi.mock("@/utils/socket", async () => {
  const { createSocketMock } = await import("../../mocks/socket/socketMock");
  return { socket: createSocketMock() };
});

vi.mock("@/utils/imageCompressor", () => ({
  imageProcessor: vi.fn()
}));

vi.mock("@/utils/filesUploader", () => ({
  filesUploader: vi.fn()
}));

const socketMock = socket as unknown as SocketMock;

/**
 * Suite de integración para la entrada de mensajes multimedia y audio
 * (`src/components/chat/ChatInput.tsx`, `MessageInputForm.tsx` y `ChatInputMediaBtns.tsx`).
 *
 * Propósito:
 *   Validar el ciclo completo de composición y envío de mensajes de texto, imágenes y notas
 *   de voz, la visibilidad condicional de botones multimedia y envío, los indicadores en
 *   tiempo real de escritura/grabación y el bloqueo de controles durante el envío.
 *
 * Qué evalúa y alcance (SUTs):
 *   - Habilitación condicional y envío (`ChatInput` + `ChatInputMediaBtns` + `MessageInputForm`):
 *     `"Enviar"` solo se muestra si existe texto, imágenes seleccionadas o audio grabado;
 *     `ChatInputMediaBtns` oculta los botones al existir texto/imágenes; al enviar se limpia el
 *     texto, las imágenes, el chat temporal (`useTemporaryChat`) y la grabación.
 *   - Indicadores en tiempo real (`UsersTypingIndicator` y `UsersRecordingAudioIndicator`):
 *     filtra estrictamente por `chatId === chatData._id` y `user._id !== currentUser._id`,
 *     omitiendo eventos propios o de otros chats.
 *   - Grabación de nota de voz (`useAudioRecording` + `AudioFileItem`): solicita micrófono vía
 *     `getUserMedia`, inicia `MediaRecorder`, emite `recordingAudio`/`stoppedRecordingAudio`,
 *     actualiza el temporizador `mm:ss`, detiene tracks del micrófono, permite descartar la
 *     grabación y permite enviarla limpiando el audio al concluir.
 *   - Estado `submitting`: deshabilita textarea, selector de archivos y botón de emojis, y
 *     cambia el botón a `"Enviando..."` mientras `POST /api/messages/send` está en curso.
 */
describe("ChatInput (MessageInputForm y ChatInputMediaBtns)", () => {
  let queryClient: QueryClient;
  let recipientsPublicKeys: PublicKeysType[];

  const currentUser = buildMockUser({
    _id: "usr_me_1",
    clerkId: "clerk_me_1",
    fullName: "Carlos Meza",
    username: "carlos_m",
    hasCryptoKeys: true
  });

  const otherUser = buildMockUser({
    _id: "usr_other_2",
    clerkId: "clerk_other_2",
    fullName: "Lucía Paredes",
    username: "lucia_p",
    hasCryptoKeys: true
  });

  const activeChat: ChatType = buildMockChat({
    _id: "chat_input_1",
    type: "private",
    participants: [currentUser, otherUser],
    lastMessage: null
  });

  const setupMediaRecorderMocks = () => {
    const trackStopSpy = vi.fn();
    const mockTrack = { stop: trackStopSpy } as unknown as MediaStreamTrack;
    const mockStream = {
      getTracks: () => [mockTrack],
      getAudioTracks: () => [mockTrack]
    } as unknown as MediaStream;

    const getUserMediaMock = vi.fn().mockResolvedValue(mockStream);
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: getUserMediaMock }
    });

    class MockMediaRecorder {
      state: "inactive" | "recording" = "inactive";
      onstart: (() => void) | null = null;
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: ((event: Event) => void) | null = null;

      constructor(_stream: MediaStream) {}

      start() {
        this.state = "recording";
        queueMicrotask(() => {
          this.onstart?.();
        });
      }

      stop() {
        if (this.state === "inactive") return;
        this.state = "inactive";
        this.ondataavailable?.({
          data: new Blob(["mock-audio-bytes"], { type: "audio/webm" })
        });
        this.onstop?.(new Event("stop"));
      }
    }

    vi.stubGlobal("MediaRecorder", MockMediaRecorder);

    return { getUserMediaMock, trackStopSpy };
  };

  const renderChatInput = (chatData: ChatType = activeChat) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <MemoryRouter initialEntries={[`/messages/${chatData._id}?type=all`]}>
            <Routes>
              <Route
                path="/messages/:chatId"
                element={
                  <ChatInput
                    chatData={chatData}
                    wrapperHeight={67}
                    chatTypeParam="all"
                    recipientsPublicKeys={recipientsPublicKeys}
                  />
                }
              />
            </Routes>
          </MemoryRouter>
        </TooltipProvider>
      </QueryClientProvider>
    );
  };

  const resetStores = () => {
    useCurrentUser.setState({ user: currentUser, loadingUser: false });
    useTemporaryChat.setState({ chat: null });
    useUsersTyping.setState({ usersTyping: [] });
    useUsersRecordingAudio.setState({ usersRecordingAudio: [] });
  };

  beforeEach(async () => {
    socketMock.reset();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    const { publicKeyJWK } = await getCachedMockKeyPair("primary");
    localStorage.setItem("publicKey", JSON.stringify(publicKeyJWK));
    recipientsPublicKeys = [
      { userId: otherUser._id, publicKey: publicKeyJWK }
    ];

    vi.mocked(imageProcessor).mockImplementation(async (file, format) => {
      if (format === "base64") {
        return "data:image/webp;base64,MOCK_PREVIEW";
      }
      return new File([file], "compressed.webp", { type: "image/webp" });
    });

    vi.mocked(filesUploader).mockResolvedValue([
      {
        fileUrl: "https://ik.imagekit.io/mock/media-1.webp",
        fileId: "file_id_1"
      }
    ]);

    resetStores();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    socketMock.reset();
    queryClient.clear();
    useCurrentUser.setState({ user: null, loadingUser: false });
    useTemporaryChat.setState({ chat: null });
    useUsersTyping.setState({ usersTyping: [] });
    useUsersRecordingAudio.setState({ usersRecordingAudio: [] });
  });

  describe("habilitación condicional y envío de texto e imágenes", () => {
    it("muestra 'Enviar' solo cuando hay contenido, oculta botones multimedia al escribir y limpia texto + chat temporal al enviar", async () => {
      const user = userEvent.setup();
      let capturedBody: {
        chatId?: string;
        type?: string;
        text?: string;
        initVector?: string;
        encryptedKeys?: unknown[];
      } | null = null;

      server.use(
        http.post("/api/messages/send", async ({ request }) => {
          capturedBody = (await request.json()) as {
            chatId?: string;
            type?: string;
            text?: string;
            initVector?: string;
            encryptedKeys?: unknown[];
          };

          return HttpResponse.json({
            data: buildMockMessage({
              chat: activeChat._id,
              sender: currentUser,
              type: "text",
              text: capturedBody.text ?? ""
            }),
            isNewChat: false,
            chat: null
          });
        })
      );

      useTemporaryChat.setState({ chat: activeChat });
      renderChatInput();

      // Estado inicial vacío: sin botón "Enviar", botones multimedia visibles
      expect(screen.queryByRole("button", { name: "Enviar" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Adjuntar imágenes" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Grabar audio" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Detener audio" })).not.toBeInTheDocument();

      const textarea = screen.getByPlaceholderText("Escribe algo...");
      await user.type(textarea, "Hola mundo cifrado");

      // Con texto: aparece "Enviar" y se ocultan los botones multimedia
      const sendBtn = screen.getByRole("button", { name: "Enviar" });
      expect(sendBtn).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Adjuntar imágenes" })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Grabar audio" })
      ).not.toBeInTheDocument();

      // Al limpiar manualmente el texto desaparece "Enviar" y vuelven los botones multimedia
      await user.clear(textarea);
      expect(screen.queryByRole("button", { name: "Enviar" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Adjuntar imágenes" })).toBeInTheDocument();

      // Escribir de nuevo y enviar
      await user.type(textarea, "Mensaje definitivo");
      await user.click(screen.getByRole("button", { name: "Enviar" }));

      await waitFor(() => {
        expect(textarea).toHaveValue("");
      });

      expect(capturedBody).not.toBeNull();
      expect(capturedBody!.chatId).toBe(activeChat._id);
      expect(capturedBody!.type).toBe("text");
      expect(capturedBody!.text).toBeTruthy();
      expect(capturedBody!.initVector).toBeTruthy();
      expect(capturedBody!.encryptedKeys).toHaveLength(2);

      // Limpieza posterior al envío
      expect(useTemporaryChat.getState().chat).toBeNull();
      expect(screen.queryByRole("button", { name: "Enviar" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Adjuntar imágenes" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Grabar audio" })).toBeInTheDocument();
    });

    it("habilita 'Enviar' con imágenes seleccionadas sin texto, muestra su previsualización y las limpia tras el envío", async () => {
      const user = userEvent.setup();
      let capturedType: string | undefined;
      let capturedFileIds: string[] | undefined;

      server.use(
        http.post("/api/messages/send", async ({ request }) => {
          const body = (await request.json()) as {
            type?: string;
            fileIds?: string[];
          };
          capturedType = body.type;
          capturedFileIds = body.fileIds;

          return HttpResponse.json({
            data: buildMockMessage({
              chat: activeChat._id,
              sender: currentUser,
              type: "image"
            }),
            isNewChat: false,
            chat: null
          });
        })
      );

      const { container } = renderChatInput();

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const imageFile = new File(["img-bytes"], "foto.png", { type: "image/png" });

      await user.upload(fileInput, imageFile);

      // Previsualización visible, botones multimedia ocultos y "Enviar" visible sin texto
      await waitFor(() => {
        const previewImg = container.querySelector(
          'img[src="data:image/webp;base64,MOCK_PREVIEW"]'
        );
        expect(previewImg).toBeInTheDocument();
      });

      expect(
        screen.queryByRole("button", { name: "Adjuntar imágenes" })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Grabar audio" })
      ).not.toBeInTheDocument();

      const sendBtn = screen.getByRole("button", { name: "Enviar" });
      await user.click(sendBtn);

      await waitFor(() => {
        expect(
          container.querySelector('img[src="data:image/webp;base64,MOCK_PREVIEW"]')
        ).not.toBeInTheDocument();
      });

      expect(capturedType).toBe("image");
      expect(capturedFileIds).toEqual(["file_id_1"]);
      expect(screen.queryByRole("button", { name: "Enviar" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Adjuntar imágenes" })).toBeInTheDocument();
    });
  });

  describe("indicadores en tiempo real (typing y recordingAudio)", () => {
    it("filtra UsersTypingIndicator y UsersRecordingAudioIndicator solo para el chatId actual excluyendo a currentUser", () => {
      const otherChatUser = buildMockUser({
        _id: "usr_other_chat",
        fullName: "Pedro Ajeno",
        username: "pedro_a"
      });
      const recordingPeer = buildMockUser({
        _id: "usr_rec_peer",
        fullName: "Marcos Audio",
        username: "marcos_a"
      });
      const recordingOtherChat = buildMockUser({
        _id: "usr_rec_other",
        fullName: "Zoe Lejana",
        username: "zoe_l"
      });

      useUsersTyping.setState({
        usersTyping: [
          { chatId: activeChat._id, user: currentUser }, // propio -> excluir
          { chatId: activeChat._id, user: otherUser }, // Lucía -> incluir ("L")
          { chatId: "chat_distinto", user: otherChatUser } // otro chat -> excluir ("P")
        ]
      });

      useUsersRecordingAudio.setState({
        usersRecordingAudio: [
          { chatId: activeChat._id, user: currentUser }, // propio -> excluir
          { chatId: activeChat._id, user: recordingPeer }, // Marcos -> incluir ("M")
          { chatId: "chat_distinto", user: recordingOtherChat } // otro chat -> excluir ("Z")
        ]
      });

      renderChatInput();

      // Solo los avatares de Lucía ("L") y Marcos ("M") deben renderizarse
      expect(screen.getByText("L")).toBeInTheDocument();
      expect(screen.getByText("M")).toBeInTheDocument();
      expect(screen.queryByText("C")).not.toBeInTheDocument();
      expect(screen.queryByText("P")).not.toBeInTheDocument();
      expect(screen.queryByText("Z")).not.toBeInTheDocument();
    });

    it("no renderiza el contenedor de indicadores cuando solo hay eventos de currentUser o de otro chat", () => {
      useUsersTyping.setState({
        usersTyping: [
          { chatId: activeChat._id, user: currentUser },
          { chatId: "chat_otro", user: otherUser }
        ]
      });
      useUsersRecordingAudio.setState({
        usersRecordingAudio: [
          { chatId: activeChat._id, user: currentUser },
          { chatId: "chat_otro", user: otherUser }
        ]
      });

      const { container } = renderChatInput();

      expect(screen.queryByText("C")).not.toBeInTheDocument();
      expect(screen.queryByText("L")).not.toBeInTheDocument();
      expect(container.querySelector("div.-top-3")).not.toBeInTheDocument();
    });
  });

  describe("grabación de nota de voz", () => {
    it("inicia y detiene la grabación actualizando el temporizador, emite eventos de socket y permite descartar el audio", async () => {
      vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
      vi.spyOn(console, "log").mockImplementation(() => {});

      const user = userEvent.setup();
      const { getUserMediaMock, trackStopSpy } = setupMediaRecorderMocks();

      renderChatInput();

      await user.click(screen.getByRole("button", { name: "Grabar audio" }));

      expect(await screen.findByText("Grabando audio...")).toBeInTheDocument();
      expect(screen.getByText("00:00")).toBeInTheDocument();
      expect(getUserMediaMock).toHaveBeenCalledTimes(1);
      expect(socketMock.emit).toHaveBeenCalledWith("recordingAudio", {
        chatId: activeChat._id,
        user: currentUser
      });

      // Mientras graba: botones de adjuntar/grabar ocultos y botón detener visible
      expect(
        screen.queryByRole("button", { name: "Adjuntar imágenes" })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Grabar audio" })
      ).not.toBeInTheDocument();
      const stopBtn = screen.getByRole("button", { name: "Detener audio" });
      expect(stopBtn).toBeInTheDocument();

      // Avanzar el temporizador 2 segundos (00:00 -> 00:02)
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(screen.getByText("00:02")).toBeInTheDocument();

      // Detener grabación: apaga tracks, emite stoppedRecordingAudio, muestra AudioFileItem y "Enviar"
      await user.click(stopBtn);

      expect(trackStopSpy).toHaveBeenCalledTimes(1);
      expect(socketMock.emit).toHaveBeenCalledWith("stoppedRecordingAudio", {
        chatId: activeChat._id,
        user: currentUser
      });
      expect(screen.queryByText("Grabando audio...")).not.toBeInTheDocument();
      expect(await screen.findByText("Audio grabado")).toBeInTheDocument();
      expect(screen.getByText("00:02")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Enviar" })).toBeInTheDocument();

      // Descartar audio antes de enviarlo
      const audioSection = screen.getByText("Audio grabado").closest("div")!.parentElement!;
      const discardBtn = audioSection.querySelector("button") as HTMLButtonElement;
      await user.click(discardBtn);

      expect(screen.queryByText("Audio grabado")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Enviar" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Grabar audio" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Adjuntar imágenes" })).toBeInTheDocument();
    });

    it("envía una nota de voz grabada con type='audio' y limpia la grabación tras el envío", async () => {
      vi.spyOn(console, "log").mockImplementation(() => {});
      const user = userEvent.setup();
      setupMediaRecorderMocks();

      let capturedType: string | undefined;

      server.use(
        http.post("/api/messages/send", async ({ request }) => {
          const body = (await request.json()) as { type?: string };
          capturedType = body.type;

          return HttpResponse.json({
            data: buildMockMessage({
              chat: activeChat._id,
              sender: currentUser,
              type: "audio"
            }),
            isNewChat: false,
            chat: null
          });
        })
      );

      renderChatInput();

      await user.click(screen.getByRole("button", { name: "Grabar audio" }));
      expect(await screen.findByText("Grabando audio...")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Detener audio" }));
      expect(await screen.findByText("Audio grabado")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Enviar" }));

      await waitFor(() => {
        expect(screen.queryByText("Audio grabado")).not.toBeInTheDocument();
      });

      expect(capturedType).toBe("audio");
      expect(screen.queryByRole("button", { name: "Enviar" })).not.toBeInTheDocument();
    });
  });

  describe("estado de envío (submitting)", () => {
    it("deshabilita textarea, selector de archivos y botón de emojis, y muestra 'Enviando...' mientras la mutación está en curso", async () => {
      const user = userEvent.setup();

      let markSendStarted!: () => void;
      const sendStarted = new Promise<void>((resolve) => {
        markSendStarted = resolve;
      });
      let releaseSend!: () => void;
      const sendGate = new Promise<void>((resolve) => {
        releaseSend = resolve;
      });

      server.use(
        http.post("/api/messages/send", async () => {
          markSendStarted();
          await sendGate;

          return HttpResponse.json({
            data: buildMockMessage({
              chat: activeChat._id,
              sender: currentUser,
              type: "text"
            }),
            isNewChat: false,
            chat: null
          });
        })
      );

      const { container } = renderChatInput();
      const textarea = screen.getByPlaceholderText("Escribe algo...");
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const emojiBtn = screen.getByRole("button", { name: "Seleccionar Emoji" });

      await user.type(textarea, "Mensaje en curso");
      await user.click(screen.getByRole("button", { name: "Enviar" }));

      await sendStarted;

      const sendingBtn = await screen.findByRole("button", { name: "Enviando..." });
      expect(sendingBtn).toBeDisabled();
      expect(textarea).toBeDisabled();
      expect(fileInput).toBeDisabled();
      expect(emojiBtn).toBeDisabled();

      await act(async () => {
        releaseSend();
      });

      await waitFor(() => {
        expect(screen.queryByRole("button", { name: "Enviando..." })).not.toBeInTheDocument();
        expect(textarea).toBeEnabled();
        expect(textarea).toHaveValue("");
      });
      expect(fileInput).toBeEnabled();
      expect(emojiBtn).toBeEnabled();
    });
  });
});
