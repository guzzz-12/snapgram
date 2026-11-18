import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import {
  useSendMessage,
  useGetChatsMessages,
  useEditMessage,
  useDeleteMessage,
  useCreateGroupChat,
  useLeaveGroup,
  useKickFromGroup
} from "@/services/chats";
import { useLeaveOrKickUser } from "@/hooks/useLeaveOrKickUser";
import { filesUploader } from "@/utils/filesUploader";
import { encryptMsgContent } from "@/utils/encryptMsgContent";
import { decryptMessage } from "@/utils/decryptMessageText";
import { server } from "../mocks/server";
import { buildMockChat, buildMockMessage } from "../mocks/chats/factories";
import { buildMockUser } from "../mocks/users/factories";
import { getCachedMockKeyPair } from "../mocks/cryptoKeys/factories";

vi.mock("@/utils/filesUploader", () => ({
  filesUploader: vi.fn()
}));

/**
 * Suite de integración para los servicios y repositorio de mensajería y grupos
 * (`src/services/chats/*` y `src/repositories/chatsRepository.ts`).
 *
 * Propósito:
 *   Verificar el flujo completo de envío cifrado E2E (texto, imágenes y audio),
 *   la paginación inversa cronológica de mensajes, la edición re-cifrada, la eliminación
 *   parcial/total y las operaciones de ciclo de vida de grupos (crear, abandonar y expulsar).
 *
 * Qué evalúa y alcance (SUTs):
 *   - `useSendMessage` + `sendMessageFn`: subida condicional de archivos (`filesUploader`),
 *     cifrado E2E real (`encryptMsgContent`), determinación exacta de `type` (`text`, `image`,
 *     `imageWithText`, `audio`), invalidación y redirección `replace: true` para chats nuevos, y toast de error.
 *   - `useGetChatsMessages` + `fetchChatMessages`: deshabilitación con `isLoadingChatData`, `chatId` vacío
 *     o prefijo `"temp_"`, inversión de orden cronológico (`.reverse()`), paginación infinita y `retry: 2`.
 *   - `useEditMessage`: omisión sin red cuando no hay cambios o faltan datos, re-cifrado con nuevo IV
 *     y envío `PUT /api/messages/edit/:chatId/:messageId`, más callbacks `onSuccess` y `onError`.
 *   - `useDeleteMessage`: guarda con mensaje nulo, query param `deleteFor=me|all` y `toast.error`.
 *   - `useCreateGroupChat` + `createGroupChatFn`: payload grupal, invalidación de `["chats", "all"]`,
 *     redirección al nuevo grupo y manejo de errores.
 *   - `useLeaveGroup` y `useKickFromGroup`: endpoints de grupo, invalidación de caché y claves de cifrado,
 *     sincronización del store Zustand `useLeaveOrKickUser`, redirección y notificaciones toast.
 */
describe("chatsServices (useSendMessage, useGetChatsMessages, useEditMessage, useDeleteMessage, useCreateGroupChat, useLeaveGroup, useKickFromGroup)", () => {
  let queryClient: QueryClient;
  const mockFilesUploader = vi.mocked(filesUploader);

  const createWrapper = (
    client: QueryClient,
    initialEntries: string[] = ["/messages"]
  ) => {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    localStorage.clear();
    mockFilesUploader.mockReset();
    useLeaveOrKickUser.setState({
      modalState: {
        isOpen: false,
        operation: null,
        kickedUser: undefined
      }
    });
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, retryDelay: 0 },
        mutations: { retry: false }
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    queryClient.clear();
  });

  describe("useSendMessage & sendMessageFn", () => {
    it("cifra y envía un mensaje de texto en un chat existente sin invocar filesUploader, ni invalidar ni redirigir", async () => {
      const senderKeys = await getCachedMockKeyPair("sender");
      const recipientKeys = await getCachedMockKeyPair("recipient");
      const currentUser = buildMockUser({ _id: "user_sender_1" });
      const recipientUser = buildMockUser({ _id: "user_recipient_2" });
      const chat = buildMockChat({ _id: "chat_existing_1", participants: [currentUser, recipientUser] });

      localStorage.setItem("publicKey", JSON.stringify(senderKeys.publicKeyJWK));
      localStorage.setItem("privateKey", JSON.stringify(recipientKeys.privateKeyJWK));

      let capturedBody: {
        text: string;
        chatId: string;
        recipientIds: string[];
        type: string;
        fileUrls: string;
        fileIds: string[];
        encryptedKeys: { userId: string; encryptedKey: string }[];
        initVector: string;
      } | null = null;

      server.use(
        http.post("/api/messages/send", async ({ request }) => {
          capturedBody = (await request.json()) as typeof capturedBody;
          return HttpResponse.json({
            data: buildMockMessage({ chat: chat._id }),
            isNewChat: false,
            chat
          });
        })
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const onSuccess = vi.fn();

      const { result } = renderHook(
        () => ({
          send: useSendMessage({
            chatData: chat,
            selectedImageFiles: [],
            recordedFile: null,
            currentUser,
            chatTypeParam: "all",
            recipientsPublicKeys: [{ userId: recipientUser._id, publicKey: recipientKeys.publicKeyJWK }]
          }),
          location: useLocation()
        }),
        { wrapper: createWrapper(queryClient, ["/messages/chat_existing_1"]) }
      );

      act(() => {
        result.current.send.mutate({ messageText: "Hola E2E", onSuccess });
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });

      expect(mockFilesUploader).not.toHaveBeenCalled();
      expect(capturedBody).not.toBeNull();
      expect(capturedBody!.chatId).toBe(chat._id);
      expect(capturedBody!.type).toBe("text");
      expect(capturedBody!.text).not.toBe("Hola E2E");
      expect(capturedBody!.fileUrls).toBe("");
      expect(capturedBody!.fileIds).toEqual([]);
      expect(capturedBody!.recipientIds).toEqual([currentUser._id, recipientUser._id]);

      // Verificar que el destinatario puede descifrar el texto realmente enviado
      const decrypted = await decryptMessage(
        buildMockMessage({
          text: capturedBody!.text,
          cryptoKeys: capturedBody!.encryptedKeys,
          initVector: capturedBody!.initVector
        }),
        recipientUser._id
      );
      expect(decrypted.text).toBe("Hola E2E");

      expect(invalidateSpy).not.toHaveBeenCalled();
      expect(result.current.location.pathname).toBe("/messages/chat_existing_1");
    });

    it("sube adjuntos y determina correctamente el tipo (imageWithText, image y audio) al enviar mensajes multimedia", async () => {
      const senderKeys = await getCachedMockKeyPair("sender");
      const recipientKeys = await getCachedMockKeyPair("recipient");
      const currentUser = buildMockUser({ _id: "user_media_1" });
      const recipientUser = buildMockUser({ _id: "user_media_2" });
      const chat = buildMockChat({ _id: "chat_media_1", participants: [currentUser, recipientUser] });

      localStorage.setItem("publicKey", JSON.stringify(senderKeys.publicKeyJWK));
      localStorage.setItem("privateKey", JSON.stringify(recipientKeys.privateKeyJWK));

      const capturedPayloads: Array<{
        text: string;
        type: string;
        fileUrls: string;
        fileIds: string[];
        encryptedKeys: { userId: string; encryptedKey: string }[];
        initVector: string;
      }> = [];

      server.use(
        http.post("/api/messages/send", async ({ request }) => {
          const body = (await request.json()) as (typeof capturedPayloads)[number];
          capturedPayloads.push(body);
          return HttpResponse.json({
            data: buildMockMessage({ chat: chat._id }),
            isNewChat: false,
            chat
          });
        })
      );

      const imageFile = new File(["img"], "pic.webp", { type: "image/webp" });
      const audioFile = new File(["aud"], "voice.webm", { type: "audio/webm" });

      // 1. imageWithText
      mockFilesUploader.mockResolvedValueOnce([
        { fileUrl: "https://ik.imagekit.io/snapgram/chat_pic.webp", fileId: "ik_img_1" }
      ]);

      const onSuccess1 = vi.fn();
      const { result: res1 } = renderHook(
        () =>
          useSendMessage({
            chatData: chat,
            selectedImageFiles: [imageFile],
            recordedFile: null,
            currentUser,
            chatTypeParam: "all",
            recipientsPublicKeys: [{ userId: recipientUser._id, publicKey: recipientKeys.publicKeyJWK }]
          }),
        { wrapper: createWrapper(queryClient) }
      );

      act(() => {
        res1.current.mutate({ messageText: "Mira esta foto", onSuccess: onSuccess1 });
      });

      await waitFor(() => expect(onSuccess1).toHaveBeenCalledTimes(1));

      expect(mockFilesUploader).toHaveBeenLastCalledWith({
        files: [imageFile],
        folderName: "/chats/chat_media_1",
        currentUser
      });
      expect(capturedPayloads[0].type).toBe("imageWithText");
      expect(capturedPayloads[0].fileIds).toEqual(["ik_img_1"]);

      // Descifrar tanto texto como fileUrls enviadas para comprobar integridad E2E
      const decryptedWithMedia = await decryptMessage(
        buildMockMessage({
          text: capturedPayloads[0].text,
          fileUrls: capturedPayloads[0].fileUrls,
          cryptoKeys: capturedPayloads[0].encryptedKeys,
          initVector: capturedPayloads[0].initVector
        }),
        recipientUser._id
      );
      expect(decryptedWithMedia.text).toBe("Mira esta foto");
      expect(JSON.parse(decryptedWithMedia.fileUrls!)).toEqual([
        "https://ik.imagekit.io/snapgram/chat_pic.webp"
      ]);

      // 2. image (sin texto)
      mockFilesUploader.mockResolvedValueOnce([
        { fileUrl: "https://ik.imagekit.io/snapgram/only_img.webp", fileId: "ik_img_2" }
      ]);

      const onSuccess2 = vi.fn();
      act(() => {
        res1.current.mutate({ messageText: "", onSuccess: onSuccess2 });
      });

      await waitFor(() => expect(onSuccess2).toHaveBeenCalledTimes(1));
      expect(capturedPayloads[1].type).toBe("image");

      // 3. audio (nota de voz)
      mockFilesUploader.mockResolvedValueOnce([
        { fileUrl: "https://ik.imagekit.io/snapgram/voice.webm", fileId: "ik_aud_1" }
      ]);

      const onSuccess3 = vi.fn();
      const { result: resAudio } = renderHook(
        () =>
          useSendMessage({
            chatData: chat,
            selectedImageFiles: [],
            recordedFile: audioFile,
            currentUser,
            chatTypeParam: "all",
            recipientsPublicKeys: [{ userId: recipientUser._id, publicKey: recipientKeys.publicKeyJWK }]
          }),
        { wrapper: createWrapper(queryClient) }
      );

      act(() => {
        resAudio.current.mutate({ messageText: "", onSuccess: onSuccess3 });
      });

      await waitFor(() => expect(onSuccess3).toHaveBeenCalledTimes(1));
      expect(mockFilesUploader).toHaveBeenLastCalledWith({
        files: [audioFile],
        folderName: "/chats/chat_media_1",
        currentUser
      });
      expect(capturedPayloads[2].type).toBe("audio");
      expect(capturedPayloads[2].fileIds).toEqual(["ik_aud_1"]);
    });

    it("invalida ['chats', chatTypeParam || 'all'] y redirige a /messages/:chatId con replace: true cuando isNewChat es true", async () => {
      const senderKeys = await getCachedMockKeyPair("sender");
      const recipientKeys = await getCachedMockKeyPair("recipient");
      const currentUser = buildMockUser({ _id: "user_new_1" });
      const recipientUser = buildMockUser({ _id: "user_new_2" });
      const tempChat = buildMockChat({ _id: "temp_user_new_2", participants: [currentUser, recipientUser] });
      const persistedChat = buildMockChat({ _id: "chat_persisted_99", participants: [currentUser, recipientUser] });

      localStorage.setItem("publicKey", JSON.stringify(senderKeys.publicKeyJWK));

      server.use(
        http.post("/api/messages/send", () => {
          return HttpResponse.json({
            data: buildMockMessage({ chat: persistedChat._id }),
            isNewChat: true,
            chat: persistedChat
          });
        })
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const onSuccess = vi.fn();

      const { result } = renderHook(
        () => ({
          send: useSendMessage({
            chatData: tempChat,
            selectedImageFiles: [],
            recordedFile: null,
            currentUser,
            chatTypeParam: null,
            recipientsPublicKeys: [
              { userId: `temp_${recipientUser._id}`, publicKey: recipientKeys.publicKeyJWK }
            ]
          }),
          location: useLocation(),
          navigate: useNavigate()
        }),
        { wrapper: createWrapper(queryClient, ["/prev-page", "/messages/temp_user_new_2"]) }
      );

      act(() => {
        result.current.send.mutate({ messageText: "Primer mensaje", onSuccess });
      });

      await waitFor(() => {
        expect(result.current.location.pathname).toBe("/messages/chat_persisted_99");
      });

      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["chats", "all"] });

      // Comprobar replace: true retrocediendo en el historial
      act(() => {
        result.current.navigate(-1);
      });
      expect(result.current.location.pathname).toBe("/prev-page");
    });

    it("muestra toast de error y evita onSuccess o navegación cuando falla el cifrado o POST /api/messages/send", async () => {
      const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "");
      const senderKeys = await getCachedMockKeyPair("sender");
      const recipientKeys = await getCachedMockKeyPair("recipient");
      const currentUser = buildMockUser({ _id: "user_err_1" });
      const recipientUser = buildMockUser({ _id: "user_err_2" });
      const chat = buildMockChat({ _id: "chat_err_1", participants: [currentUser, recipientUser] });

      localStorage.setItem("publicKey", JSON.stringify(senderKeys.publicKeyJWK));

      server.use(
        http.post("/api/messages/send", () => {
          return HttpResponse.json(
            { message: "No puedes enviar mensajes en este chat" },
            { status: 403 }
          );
        })
      );

      const onSuccess = vi.fn();

      const { result } = renderHook(
        () =>
          useSendMessage({
            chatData: chat,
            selectedImageFiles: [],
            recordedFile: null,
            currentUser,
            chatTypeParam: "all",
            recipientsPublicKeys: [{ userId: recipientUser._id, publicKey: recipientKeys.publicKeyJWK }]
          }),
        { wrapper: createWrapper(queryClient) }
      );

      act(() => {
        result.current.mutate({ messageText: "Intento fallido", onSuccess });
      });

      await waitFor(() => {
        expect(toastErrorSpy).toHaveBeenCalledTimes(1);
      });

      expect(toastErrorSpy).toHaveBeenCalledWith("No puedes enviar mensajes en este chat");
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe("useGetChatsMessages & fetchChatMessages", () => {
    it("deshabilita la consulta si chatId es undefined, comienza con 'temp_' o isLoadingChatData es true", () => {
      const fetchSpy = vi.fn();
      server.use(
        http.get("/api/messages/chat/:chatId", () => {
          fetchSpy();
          return HttpResponse.json({
            data: { messages: [], chat: buildMockChat() },
            hasMore: false,
            nextPage: null
          });
        })
      );

      const { result: r1 } = renderHook(
        () => useGetChatsMessages({ chatId: undefined, isLoadingChatData: false }),
        { wrapper: createWrapper(queryClient) }
      );
      const { result: r2 } = renderHook(
        () => useGetChatsMessages({ chatId: "temp_user_123", isLoadingChatData: false }),
        { wrapper: createWrapper(queryClient) }
      );
      const { result: r3 } = renderHook(
        () => useGetChatsMessages({ chatId: "chat_real_1", isLoadingChatData: true }),
        { wrapper: createWrapper(queryClient) }
      );

      expect(r1.current.messages).toEqual([]);
      expect(r2.current.messages).toEqual([]);
      expect(r3.current.messages).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("consulta /api/messages/chat/:chatId con paginación e invierte el orden de los mensajes para mostrarlos cronológicamente", async () => {
      const chat = buildMockChat({ _id: "chat_pag_1" });
      // El backend devuelve más recientes primero por página
      const msg3Newest = buildMockMessage({ _id: "m3", chat: chat._id, text: "3 - más reciente" });
      const msg2Middle = buildMockMessage({ _id: "m2", chat: chat._id, text: "2 - intermedio" });
      const msg1Oldest = buildMockMessage({ _id: "m1", chat: chat._id, text: "1 - más antiguo" });

      const requestedPages: Array<{ page: string | null; limit: string | null }> = [];

      server.use(
        http.get("/api/messages/chat/:chatId", ({ params, request }) => {
          expect(params.chatId).toBe("chat_pag_1");
          const url = new URL(request.url);
          const page = url.searchParams.get("page");
          const limit = url.searchParams.get("limit");
          requestedPages.push({ page, limit });

          if (page === "1") {
            return HttpResponse.json({
              data: { messages: [msg3Newest, msg2Middle], chat },
              hasMore: true,
              nextPage: 2
            });
          }

          return HttpResponse.json({
            data: { messages: [msg1Oldest], chat },
            hasMore: false,
            nextPage: null
          });
        })
      );

      const { result } = renderHook(
        () => useGetChatsMessages({ chatId: "chat_pag_1", isLoadingChatData: false }),
        { wrapper: createWrapper(queryClient) }
      );

      await waitFor(() => {
        expect(result.current.isLoadingMessages).toBe(false);
        expect(result.current.messages).toHaveLength(2);
      });

      expect(requestedPages[0]).toEqual({ page: "1", limit: "10" });
      // Orden invertido: primero el más antiguo de la página 1, luego el más reciente
      expect(result.current.messages.map((m) => m._id)).toEqual(["m2", "m3"]);
      expect(result.current.hasNextPage).toBe(true);

      // Cargar página 2 (mensajes más antiguos)
      act(() => {
        result.current.fetchNextPage();
      });

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(3);
      });

      expect(requestedPages[1]).toEqual({ page: "2", limit: "10" });
      expect(result.current.hasNextPage).toBe(false);
      // Orden cronológico completo: m1 (antiguo) -> m2 -> m3 (reciente)
      expect(result.current.messages.map((m) => m._id)).toEqual(["m1", "m2", "m3"]);
    });

    it("reintenta 2 veces (retry: 2) antes de exponer el error cuando falla la carga de mensajes", async () => {
      let requestCount = 0;

      server.use(
        http.get("/api/messages/chat/:chatId", () => {
          requestCount += 1;
          return HttpResponse.json({ message: "Error cargando mensajes" }, { status: 500 });
        })
      );

      const { result } = renderHook(
        () => useGetChatsMessages({ chatId: "chat_fail_1", isLoadingChatData: false }),
        { wrapper: createWrapper(queryClient) }
      );

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(requestCount).toBe(3); // 1 intento inicial + 2 reintentos
      expect(result.current.messages).toEqual([]);
    });
  });

  describe("useEditMessage", () => {
    it("no realiza petición PUT cuando el texto es idéntico al actual o falta el mensaje/usuario", async () => {
      const currentUser = buildMockUser();
      const message = buildMockMessage({ text: "Texto sin cambios" });
      const putSpy = vi.fn();
      const onSuccess = vi.fn();
      const onError = vi.fn();

      server.use(
        http.put("/api/messages/edit/:chatId/:messageId", () => {
          putSpy();
          return HttpResponse.json({ data: message });
        })
      );

      // 1. Texto sin cambios
      const { result: sameText } = renderHook(
        () =>
          useEditMessage({
            message,
            messageText: "Texto sin cambios",
            currentUser,
            onSuccess,
            onError
          }),
        { wrapper: createWrapper(queryClient) }
      );

      act(() => {
        sameText.current.updateMessage();
      });

      await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
      expect(putSpy).not.toHaveBeenCalled();

      // 2. Mensaje null
      const { result: nullMsg } = renderHook(
        () =>
          useEditMessage({
            message: null,
            messageText: "Nuevo texto",
            currentUser,
            onSuccess,
            onError
          }),
        { wrapper: createWrapper(queryClient) }
      );

      act(() => {
        nullMsg.current.updateMessage();
      });

      await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(2));
      expect(putSpy).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it("re-cifra el texto editado con encryptEditedMessage (nuevo IV) y envía PUT /api/messages/edit/:chatId/:messageId", async () => {
      const senderKeys = await getCachedMockKeyPair("sender");
      const recipientKeys = await getCachedMockKeyPair("recipient");
      const currentUser = buildMockUser({ _id: "editor_1" });
      const recipientId = "recipient_edit_2";

      localStorage.setItem("publicKey", JSON.stringify(senderKeys.publicKeyJWK));
      localStorage.setItem("privateKey", JSON.stringify(senderKeys.privateKeyJWK));

      const initialEncrypted = await encryptMsgContent({
        text: "Mensaje original",
        currentUser,
        recipientsPublicKeys: [{ userId: recipientId, publicKey: recipientKeys.publicKeyJWK }]
      });

      const originalMsg = buildMockMessage({
        _id: "msg_edit_10",
        chat: "chat_edit_10",
        text: initialEncrypted.encryptedMessage,
        cryptoKeys: initialEncrypted.encryptedKeys,
        initVector: initialEncrypted.iv
      });

      let capturedParams: { chatId: string; messageId: string } | null = null;
      let capturedBody: { text: string; iv: string } | null = null;

      server.use(
        http.put("/api/messages/edit/:chatId/:messageId", async ({ params, request }) => {
          capturedParams = {
            chatId: params.chatId as string,
            messageId: params.messageId as string
          };
          capturedBody = (await request.json()) as { text: string; iv: string };
          return HttpResponse.json({
            data: { ...originalMsg, text: capturedBody.text, initVector: capturedBody.iv }
          });
        })
      );

      const onSuccess = vi.fn();
      const onError = vi.fn();

      const { result } = renderHook(
        () =>
          useEditMessage({
            message: originalMsg,
            messageText: "Mensaje corregido",
            currentUser,
            onSuccess,
            onError
          }),
        { wrapper: createWrapper(queryClient) }
      );

      act(() => {
        result.current.updateMessage();
      });

      await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));

      expect(capturedParams).toEqual({ chatId: "chat_edit_10", messageId: "msg_edit_10" });
      expect(capturedBody).not.toBeNull();
      expect(capturedBody!.text).not.toBe("Mensaje corregido");
      expect(capturedBody!.iv).toBeTruthy();
      expect(capturedBody!.iv).not.toBe(initialEncrypted.iv);

      // Comprobar que el destinatario puede descifrar la edición enviada
      localStorage.setItem("privateKey", JSON.stringify(recipientKeys.privateKeyJWK));
      const decryptedEdit = await decryptMessage(
        {
          ...originalMsg,
          text: capturedBody!.text,
          initVector: capturedBody!.iv
        },
        recipientId
      );
      expect(decryptedEdit.text).toBe("Mensaje corregido");
      expect(onError).not.toHaveBeenCalled();
    });

    it("invoca onError y no llama a onSuccess si PUT /api/messages/edit falla", async () => {
      const senderKeys = await getCachedMockKeyPair("sender");
      const recipientKeys = await getCachedMockKeyPair("recipient");
      const currentUser = buildMockUser({ _id: "editor_err_1" });

      localStorage.setItem("publicKey", JSON.stringify(senderKeys.publicKeyJWK));
      localStorage.setItem("privateKey", JSON.stringify(senderKeys.privateKeyJWK));

      const initialEncrypted = await encryptMsgContent({
        text: "Original",
        currentUser,
        recipientsPublicKeys: [{ userId: "rec_1", publicKey: recipientKeys.publicKeyJWK }]
      });

      const msg = buildMockMessage({
        _id: "msg_err_1",
        chat: "chat_err_1",
        text: initialEncrypted.encryptedMessage,
        cryptoKeys: initialEncrypted.encryptedKeys,
        initVector: initialEncrypted.iv
      });

      server.use(
        http.put("/api/messages/edit/:chatId/:messageId", () => {
          return HttpResponse.json({ message: "Tiempo de edición expirado" }, { status: 400 });
        })
      );

      const onSuccess = vi.fn();
      const onError = vi.fn();

      const { result } = renderHook(
        () =>
          useEditMessage({
            message: msg,
            messageText: "Nuevo texto",
            currentUser,
            onSuccess,
            onError
          }),
        { wrapper: createWrapper(queryClient) }
      );

      act(() => {
        result.current.updateMessage();
      });

      await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe("useDeleteMessage", () => {
    it("envía DELETE /api/messages/delete/:chatId/:msgId con deleteFor='me' y deleteFor='all', y omite red si message es null", async () => {
      const capturedCalls: Array<{ chatId: string; messageId: string; deleteFor: string | null }> = [];

      server.use(
        http.delete("/api/messages/delete/:chatId/:messageId", ({ params, request }) => {
          const url = new URL(request.url);
          capturedCalls.push({
            chatId: params.chatId as string,
            messageId: params.messageId as string,
            deleteFor: url.searchParams.get("deleteFor")
          });
          return HttpResponse.json({ data: buildMockMessage() });
        })
      );

      // 1. Guarda con message: null
      const { result: nullHook } = renderHook(() => useDeleteMessage({ message: null }), {
        wrapper: createWrapper(queryClient)
      });
      act(() => {
        nullHook.current.mutate("me");
      });
      await waitFor(() => expect(nullHook.current.isPending).toBe(false));
      expect(capturedCalls).toHaveLength(0);

      // 2. deleteFor="me" y deleteFor="all"
      const message = buildMockMessage({ _id: "msg_del_5", chat: "chat_del_5" });
      const { result } = renderHook(() => useDeleteMessage({ message }), {
        wrapper: createWrapper(queryClient)
      });

      act(() => {
        result.current.mutate("me");
      });
      await waitFor(() => expect(capturedCalls).toHaveLength(1));

      act(() => {
        result.current.mutate("all");
      });
      await waitFor(() => expect(capturedCalls).toHaveLength(2));

      expect(capturedCalls).toEqual([
        { chatId: "chat_del_5", messageId: "msg_del_5", deleteFor: "me" },
        { chatId: "chat_del_5", messageId: "msg_del_5", deleteFor: "all" }
      ]);
    });

    it("muestra toast de error si falla DELETE /api/messages/delete/:chatId/:msgId", async () => {
      const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "");
      const message = buildMockMessage({ _id: "msg_del_err", chat: "chat_del_err" });

      server.use(
        http.delete("/api/messages/delete/:chatId/:messageId", () => {
          return HttpResponse.json({ message: "No puedes eliminar este mensaje" }, { status: 403 });
        })
      );

      const { result } = renderHook(() => useDeleteMessage({ message }), {
        wrapper: createWrapper(queryClient)
      });

      act(() => {
        result.current.mutate("all");
      });

      await waitFor(() => {
        expect(toastErrorSpy).toHaveBeenCalledWith("No puedes eliminar este mensaje");
      });
    });
  });

  describe("useCreateGroupChat & createGroupChatFn", () => {
    it("envía POST /api/chats/create, invalida ['chats', 'all'] y redirige al nuevo grupo", async () => {
      const adminUser = buildMockUser({ _id: "admin_1" });
      const createdGroup = buildMockChat({ _id: "group_new_77", type: "group", groupName: "Devs" });
      let capturedBody: {
        type: string;
        participants: string[];
        groupName: string;
        groupAdmin: string;
      } | null = null;

      server.use(
        http.post("/api/chats/create", async ({ request }) => {
          capturedBody = (await request.json()) as typeof capturedBody;
          return HttpResponse.json({ data: createdGroup });
        })
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(
        () => ({
          createGroup: useCreateGroupChat(),
          location: useLocation()
        }),
        { wrapper: createWrapper(queryClient, ["/messages?type=group"]) }
      );

      act(() => {
        result.current.createGroup.createGroupChatMutation({
          currentUser: adminUser,
          selectedUsersIds: ["user_2", "user_3"],
          groupName: "Devs"
        });
      });

      await waitFor(() => {
        expect(result.current.location.pathname).toBe("/messages/group_new_77");
      });

      expect(capturedBody).toEqual({
        type: "group",
        participants: ["user_2", "user_3"],
        groupName: "Devs",
        groupAdmin: "admin_1"
      });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["chats", "all"] });
    });

    it("no envía petición si currentUser es null y muestra toast de error cuando POST /api/chats/create falla", async () => {
      const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "");
      const postSpy = vi.fn();

      server.use(
        http.post("/api/chats/create", () => {
          postSpy();
          return HttpResponse.json({ message: "Nombre de grupo inválido" }, { status: 400 });
        })
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(
        () => ({
          createGroup: useCreateGroupChat(),
          location: useLocation()
        }),
        { wrapper: createWrapper(queryClient, ["/messages?type=group"]) }
      );

      // 1. Guarda con currentUser: null
      act(() => {
        result.current.createGroup.createGroupChatMutation({
          currentUser: null,
          selectedUsersIds: ["u2"],
          groupName: "Sin admin"
        });
      });
      await waitFor(() => expect(result.current.createGroup.isCreatingGroup).toBe(false));
      expect(postSpy).not.toHaveBeenCalled();

      // 2. Error 400
      invalidateSpy.mockClear();
      act(() => {
        result.current.createGroup.createGroupChatMutation({
          currentUser: buildMockUser(),
          selectedUsersIds: ["u2"],
          groupName: "Grupo inválido"
        });
      });

      await waitFor(() => {
        expect(toastErrorSpy).toHaveBeenCalledWith("Nombre de grupo inválido");
      });
      expect(postSpy).toHaveBeenCalledTimes(1);
      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });

  describe("useLeaveGroup", () => {
    it("envía PUT /api/chats/group/:id/leave, invalida cachés, cierra el modal y redirige a /messages?type=all con replace: true", async () => {
      const currentUser = buildMockUser();
      const groupChat = buildMockChat({ _id: "group_leave_5", type: "group" });

      useLeaveOrKickUser.setState({
        modalState: { isOpen: true, operation: "Abandonar", kickedUser: undefined }
      });

      let leftGroupId: string | undefined;
      server.use(
        http.put("/api/chats/group/:chatId/leave", ({ params }) => {
          leftGroupId = params.chatId as string;
          return HttpResponse.json({ data: groupChat });
        })
      );

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(
        () => ({
          leave: useLeaveGroup({ chatData: groupChat, currentUser }),
          location: useLocation(),
          navigate: useNavigate()
        }),
        { wrapper: createWrapper(queryClient, ["/home-prev", "/messages/group_leave_5"]) }
      );

      act(() => {
        result.current.leave.leaveGroup();
      });

      await waitFor(() => {
        expect(result.current.location.pathname).toBe("/messages");
        expect(result.current.location.search).toBe("?type=all");
      });

      expect(leftGroupId).toBe("group_leave_5");
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["chats", "all"] });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["recipientsCryptoKeys", "group_leave_5"]
      });
      expect(useLeaveOrKickUser.getState().modalState).toEqual({
        operation: null,
        isOpen: false
      });

      // Comprobar replace: true
      act(() => {
        result.current.navigate(-1);
      });
      expect(result.current.location.pathname).toBe("/home-prev");
    });

    it("muestra toast de error y mantiene el modal abierto y la ruta actual cuando falla PUT /api/chats/group/:id/leave", async () => {
      const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "");
      const currentUser = buildMockUser();
      const groupChat = buildMockChat({ _id: "group_leave_err", type: "group" });

      useLeaveOrKickUser.setState({
        modalState: { isOpen: true, operation: "Abandonar", kickedUser: undefined }
      });

      server.use(
        http.put("/api/chats/group/:chatId/leave", () => {
          return HttpResponse.json(
            { message: "El administrador no puede abandonar el grupo" },
            { status: 400 }
          );
        })
      );

      const { result } = renderHook(
        () => ({
          leave: useLeaveGroup({ chatData: groupChat, currentUser }),
          location: useLocation()
        }),
        { wrapper: createWrapper(queryClient, ["/messages/group_leave_err"]) }
      );

      act(() => {
        result.current.leave.leaveGroup();
      });

      await waitFor(() => {
        expect(toastErrorSpy).toHaveBeenCalledWith(
          "El administrador no puede abandonar el grupo"
        );
      });

      expect(useLeaveOrKickUser.getState().modalState.isOpen).toBe(true);
      expect(result.current.location.pathname).toBe("/messages/group_leave_err");
    });
  });

  describe("useKickFromGroup", () => {
    it("envía PUT /api/chats/group/:id/kick con participantId, invalida cachés, muestra toast de éxito y resetea el modal", async () => {
      const groupChat = buildMockChat({ _id: "group_kick_9", type: "group" });
      const kickedUser = buildMockUser({ _id: "member_kick_3", fullName: "Carlos Méndez" });

      useLeaveOrKickUser.setState({
        modalState: { isOpen: true, operation: "Eliminar", kickedUser }
      });

      let capturedBody: { participantId: string } | null = null;
      let kickedFromChatId: string | undefined;

      server.use(
        http.put("/api/chats/group/:chatId/kick", async ({ params, request }) => {
          kickedFromChatId = params.chatId as string;
          capturedBody = (await request.json()) as { participantId: string };
          return HttpResponse.json({ data: groupChat });
        })
      );

      const toastSuccessSpy = vi.spyOn(toast, "success").mockImplementation(() => "");
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useKickFromGroup({ chatData: groupChat }), {
        wrapper: createWrapper(queryClient)
      });

      act(() => {
        result.current.kickUser();
      });

      await waitFor(() => {
        expect(toastSuccessSpy).toHaveBeenCalledTimes(1);
      });

      expect(kickedFromChatId).toBe("group_kick_9");
      expect(capturedBody).toEqual({ participantId: "member_kick_3" });
      expect(toastSuccessSpy).toHaveBeenCalledWith("Has expulsado a Carlos del grupo");
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["groupInfo", "group_kick_9"] });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["recipientsCryptoKeys", "group_kick_9"]
      });
      expect(useLeaveOrKickUser.getState().modalState).toEqual({
        operation: null,
        kickedUser: undefined,
        isOpen: false
      });
    });

    it("muestra toast de error sin cerrar el modal ni invalidar cachés cuando falla la expulsión", async () => {
      const groupChat = buildMockChat({ _id: "group_kick_err", type: "group" });
      const kickedUser = buildMockUser({ _id: "member_kick_err", fullName: "Ana Ruiz" });

      useLeaveOrKickUser.setState({
        modalState: { isOpen: true, operation: "Eliminar", kickedUser }
      });

      server.use(
        http.put("/api/chats/group/:chatId/kick", () => {
          return HttpResponse.json(
            { message: "Sólo el administrador puede expulsar miembros" },
            { status: 403 }
          );
        })
      );

      const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "");
      const toastSuccessSpy = vi.spyOn(toast, "success").mockImplementation(() => "");
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useKickFromGroup({ chatData: groupChat }), {
        wrapper: createWrapper(queryClient)
      });

      act(() => {
        result.current.kickUser();
      });

      await waitFor(() => {
        expect(toastErrorSpy).toHaveBeenCalledWith(
          "Sólo el administrador puede expulsar miembros"
        );
      });

      expect(toastSuccessSpy).not.toHaveBeenCalled();
      expect(invalidateSpy).not.toHaveBeenCalled();
      expect(useLeaveOrKickUser.getState().modalState.isOpen).toBe(true);
    });
  });
});
