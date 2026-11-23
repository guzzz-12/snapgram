import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mockIntersectionObserver } from "jsdom-testing-mocks";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import MessageItem from "@/components/chat/MessageItem";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useImagesLighbox } from "@/hooks/useImagesLightbox";
import { encryptMsgContent } from "@/utils/encryptMsgContent";
import { encryptEditedMessage } from "@/utils/encryptEditedMessage";
import { socket } from "@/utils/socket";
import type { ChatType, MessageType, UserType } from "@/types/global";
import { server } from "../../mocks/server";
import { buildMockUser } from "../../mocks/users/factories";
import { buildMockChat, buildMockMessage } from "../../mocks/chats/factories";
import { getCachedMockKeyPair } from "../../mocks/cryptoKeys/factories";
import type { SocketMock } from "../../mocks/socket/socketMock";

vi.mock("@/utils/socket", async () => {
  const { createSocketMock } = await import("../../mocks/socket/socketMock");
  return { socket: createSocketMock() };
});

const socketMock = socket as unknown as SocketMock;

/**
 * Suite de integración para ítems de mensaje, edición e historial
 * (`src/components/chat/MessageItem.tsx`, `MessageDropdown.tsx` y `MessageHistoryModal.tsx`).
 *
 * Propósito:
 *   Validar el descifrado real extremo a extremo al montar, el renderizado según tipo de
 *   mensaje (texto, galería de imágenes con visor Lightbox y audio), las acciones de edición
 *   y eliminación diferenciadas por rol (remitente vs destinatario), el estado eliminado,
 *   el historial de ediciones descifrado y el registro de "Visto" vía `IntersectionObserver`.
 *
 * Qué evalúa y alcance (SUTs):
 *   - Descifrado y renderizado (`MessageItem` + `decryptMessage`): descifra texto, imágenes
 *     (abriendo `useImagesLighbox` con índice exacto al pulsar) y audio (`<audio controls>`).
 *   - Edición de mensaje propio (`MessageDropdown` + `MessageInputForm` + `useEditMessage`):
 *     oculta `"Editar"` en audios, permite cancelar sin petición `PUT`, envía texto cifrado a
 *     `PUT /api/messages/edit/:chatId/:messageId` y revierte el texto mostrando `toast.error`
 *     si falla la edición.
 *   - Eliminación (`MessageDropdown` + `useDeleteMessage`): muestra `"Eliminar para mí"` y
 *     `"Eliminar para todos"` al remitente, únicamente `"Eliminar para mí"` al destinatario,
 *     envía `DELETE /api/messages/delete/:chatId/:messageId?deleteFor=me|all`, y ante
 *     `deletedForAll: true` muestra `"Mensaje eliminado"` ocultando el menú de opciones.
 *   - Historial (`MessageHistoryModal` + `decryptMsgHistory`): muestra el botón `"Editado"`
 *     solo cuando `history.length > 0` y descifra todas las versiones anteriores al abrirlo.
 *   - Estado de visto y chats grupales: muestra check `Visto ...` al remitente, emite
 *     `socket.emit("messageSeenBy")` al entrar en viewport para destinatarios (nunca para el
 *     remitente) y muestra el autor en chats grupales.
 */
describe("MessageItem (MessageDropdown y MessageHistoryModal)", () => {
  let queryClient: QueryClient;
  let io: ReturnType<typeof mockIntersectionObserver>;
  let publicKeyJWK: JsonWebKey;
  let privateKeyJWK: JsonWebKey;

  const currentUser = buildMockUser({
    _id: "usr_me_1",
    clerkId: "clerk_me_1",
    fullName: "Carlos Meza",
    username: "carlos_m",
    hasCryptoKeys: true
  });

  const peerUser = buildMockUser({
    _id: "usr_peer_2",
    clerkId: "clerk_peer_2",
    fullName: "Lucía Paredes",
    username: "lucia_p",
    hasCryptoKeys: true
  });

  const baseChat: ChatType = buildMockChat({
    _id: "chat_msg_1",
    type: "private",
    participants: [currentUser, peerUser],
    lastMessage: null
  });

  const buildEncryptedMessage = async ({
    text = "",
    filesUrls = [],
    type = "text",
    sender = currentUser,
    overrides = {}
  }: {
    text?: string;
    filesUrls?: string[];
    type?: MessageType["type"];
    sender?: UserType;
    overrides?: Partial<MessageType>;
  }): Promise<MessageType> => {
    const encrypted = await encryptMsgContent({
      text,
      filesUrls,
      currentUser,
      recipientsPublicKeys: [{ userId: peerUser._id, publicKey: publicKeyJWK }]
    });

    return buildMockMessage({
      _id: "msg_enc_1",
      chat: baseChat._id,
      sender,
      type,
      text: text ? encrypted.encryptedMessage : null,
      fileUrls: filesUrls.length > 0 ? encrypted.encryptedFileUrls : null,
      cryptoKeys: encrypted.encryptedKeys,
      initVector: encrypted.iv,
      seenBy: [],
      deletedFor: [],
      deletedForAll: false,
      history: [],
      ...overrides
    });
  };

  const renderMessageItem = ({
    messageData,
    chatData = baseChat,
    chatType = "private"
  }: {
    messageData: MessageType;
    chatData?: ChatType;
    chatType?: "private" | "group";
  }) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ul>
            <MessageItem
              currentUser={currentUser}
              messageData={messageData}
              chatData={chatData}
              chatType={chatType}
            />
          </ul>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  beforeEach(async () => {
    io = mockIntersectionObserver();
    socketMock.reset();
    localStorage.clear();

    const pair = await getCachedMockKeyPair("primary");
    publicKeyJWK = pair.publicKeyJWK;
    privateKeyJWK = pair.privateKeyJWK;
    localStorage.setItem("publicKey", JSON.stringify(publicKeyJWK));
    localStorage.setItem("privateKey", JSON.stringify(privateKeyJWK));

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    useCurrentUser.setState({ user: currentUser, loadingUser: false });
    useImagesLighbox.setState({ images: [], initialIndex: 0, open: false });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    socketMock.reset();
    vi.restoreAllMocks();
    queryClient.clear();
    useCurrentUser.setState({ user: null, loadingUser: false });
    useImagesLighbox.setState({ images: [], initialIndex: 0, open: false });
  });

  describe("descifrado y renderizado por tipo de mensaje", () => {
    it("descifra texto e imágenes al montar y abre ImagesLightbox con el índice exacto al pulsar una imagen", async () => {
      const user = userEvent.setup();
      const urls = [
        "https://ik.imagekit.io/mock/foto-1.webp",
        "https://ik.imagekit.io/mock/foto-2.webp"
      ];

      const encryptedMsg = await buildEncryptedMessage({
        text: "Mira estas dos fotos",
        filesUrls: urls,
        type: "imageWithText"
      });

      const { container } = renderMessageItem({ messageData: encryptedMsg });

      expect(await screen.findByText("Mira estas dos fotos")).toBeInTheDocument();

      const images = container.querySelectorAll("img");
      expect(images).toHaveLength(2);
      expect(images[0]).toHaveAttribute("src", urls[0]);
      expect(images[1]).toHaveAttribute("src", urls[1]);

      // Al pulsar el botón de la segunda imagen, debe abrir el Lightbox en initialIndex = 1
      const secondImgBtn = images[1].closest("button") as HTMLButtonElement;
      await user.click(secondImgBtn);

      expect(useImagesLighbox.getState()).toMatchObject({
        open: true,
        images: urls,
        initialIndex: 1
      });
    });

    it("descifra y renderiza el reproductor <audio controls> y oculta la opción 'Editar' en mensajes de audio", async () => {
      const user = userEvent.setup();
      const audioUrl = "https://ik.imagekit.io/mock/nota-voz.webm";

      const audioMsg = await buildEncryptedMessage({
        filesUrls: [audioUrl],
        type: "audio"
      });

      const { container } = renderMessageItem({ messageData: audioMsg });

      await waitFor(() => {
        const audioEl = container.querySelector("audio");
        expect(audioEl).toBeInTheDocument();
        expect(audioEl).toHaveAttribute("src", audioUrl);
        expect(audioEl).toHaveAttribute("controls");
      });

      // En mensajes de audio propios no debe ofrecerse "Editar", pero sí eliminar
      await user.click(
        screen.getByRole("button", { name: "Mostrar opciones del mensaje" })
      );

      expect(screen.queryByRole("menuitem", { name: "Editar" })).not.toBeInTheDocument();
      expect(
        screen.getByRole("menuitem", { name: "Eliminar para mí" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("menuitem", { name: "Eliminar para todos" })
      ).toBeInTheDocument();
    });
  });

  describe("edición de mensaje propio", () => {
    it("permite abrir modo edición, cancelar sin enviar PUT y guardar el texto cifrado vía PUT /api/messages/edit/:chatId/:messageId", async () => {
      const user = userEvent.setup();

      const encryptedMsg = await buildEncryptedMessage({
        text: "Mensaje original cifrado",
        type: "text"
      });

      let putCalls = 0;
      const captured: {
        chatId?: string;
        messageId?: string;
        body: { text?: string; iv?: string } | null;
      } = { body: null };

      server.use(
        http.put("/api/messages/edit/:chatId/:messageId", async ({ params, request }) => {
          putCalls += 1;
          captured.chatId = params.chatId as string;
          captured.messageId = params.messageId as string;
          captured.body = (await request.json()) as { text?: string; iv?: string };

          return HttpResponse.json({
            data: {
              ...encryptedMsg,
              text: captured.body.text ?? encryptedMsg.text,
              initVector: captured.body.iv ?? encryptedMsg.initVector
            }
          });
        })
      );

      renderMessageItem({ messageData: encryptedMsg });

      expect(await screen.findByText("Mensaje original cifrado")).toBeInTheDocument();

      // Abrir edición y cancelar sin enviar PUT
      await user.click(
        screen.getByRole("button", { name: "Mostrar opciones del mensaje" })
      );
      await user.click(await screen.findByRole("menuitem", { name: "Editar" }));

      const editTextarea = screen.getByPlaceholderText("Escribe algo...");
      expect(editTextarea).toHaveValue("Mensaje original cifrado");
      expect(
        screen.queryByText("Mensaje original cifrado", { selector: "p" })
      ).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Cancelar" }));
      expect(screen.queryByRole("button", { name: "Guardar" })).not.toBeInTheDocument();
      expect(screen.getByText("Mensaje original cifrado")).toBeInTheDocument();
      expect(putCalls).toBe(0);

      // Volver a abrir edición, modificar y guardar
      await user.click(
        screen.getByRole("button", { name: "Mostrar opciones del mensaje" })
      );
      await user.click(await screen.findByRole("menuitem", { name: "Editar" }));

      const textarea = screen.getByPlaceholderText("Escribe algo...");
      await user.clear(textarea);
      await user.type(textarea, "Mensaje corregido");

      await user.click(screen.getByRole("button", { name: "Guardar" }));

      await waitFor(() => {
        expect(screen.queryByRole("button", { name: "Guardar" })).not.toBeInTheDocument();
      });

      expect(putCalls).toBe(1);
      expect({ chatId: captured.chatId, messageId: captured.messageId }).toEqual({
        chatId: baseChat._id,
        messageId: encryptedMsg._id
      });
      expect(captured.body?.text).toBeTruthy();
      expect(captured.body?.text).not.toBe("Mensaje corregido");
      expect(captured.body?.iv).toBeTruthy();
      expect(captured.body?.iv).not.toBe(encryptedMsg.initVector);
    });

    it("muestra toast.error y revierte el texto del input si falla PUT /api/messages/edit/:chatId/:messageId", async () => {
      const user = userEvent.setup();

      const encryptedMsg = await buildEncryptedMessage({
        text: "Texto estable",
        type: "text"
      });

      server.use(
        http.put("/api/messages/edit/:chatId/:messageId", () =>
          HttpResponse.json(
            { message: "No se pudo editar el mensaje" },
            { status: 500 }
          )
        )
      );

      const toastErrorSpy = vi
        .spyOn(toast, "error")
        .mockImplementation(() => "toast-id");

      renderMessageItem({ messageData: encryptedMsg });

      expect(await screen.findByText("Texto estable")).toBeInTheDocument();

      await user.click(
        screen.getByRole("button", { name: "Mostrar opciones del mensaje" })
      );
      await user.click(await screen.findByRole("menuitem", { name: "Editar" }));

      const textarea = screen.getByPlaceholderText("Escribe algo...");
      await user.clear(textarea);
      await user.type(textarea, "Intento fallido");
      await user.click(screen.getByRole("button", { name: "Guardar" }));

      await waitFor(() => {
        expect(toastErrorSpy).toHaveBeenCalledWith("No se pudo editar el mensaje");
      });

      // El textarea revierte al contenido original del mensaje
      expect(textarea).toHaveValue("Texto estable");
    });
  });

  describe("eliminación de mensaje y estado eliminado", () => {
    it("envía DELETE con deleteFor='me' y deleteFor='all' desde las opciones del remitente", async () => {
      const user = userEvent.setup();

      const encryptedMsg = await buildEncryptedMessage({
        text: "Mensaje eliminable",
        type: "text"
      });

      const capturedDeleteModes: Array<string | null> = [];

      server.use(
        http.delete("/api/messages/delete/:chatId/:messageId", ({ request }) => {
          const deleteFor = new URL(request.url).searchParams.get("deleteFor");
          capturedDeleteModes.push(deleteFor);
          return HttpResponse.json({
            data: { ...encryptedMsg, deletedForAll: deleteFor === "all" }
          });
        })
      );

      renderMessageItem({ messageData: encryptedMsg });

      expect(await screen.findByText("Mensaje eliminable")).toBeInTheDocument();

      await user.click(
        screen.getByRole("button", { name: "Mostrar opciones del mensaje" })
      );
      await user.click(
        await screen.findByRole("menuitem", { name: "Eliminar para mí" })
      );

      await waitFor(() => {
        expect(capturedDeleteModes).toEqual(["me"]);
      });

      await user.click(
        screen.getByRole("button", { name: "Mostrar opciones del mensaje" })
      );
      await user.click(
        await screen.findByRole("menuitem", { name: "Eliminar para todos" })
      );

      await waitFor(() => {
        expect(capturedDeleteModes).toEqual(["me", "all"]);
      });
    });

    it("muestra únicamente 'Eliminar para mí' al destinatario (sin 'Editar' ni 'Eliminar para todos')", async () => {
      const user = userEvent.setup();

      const peerMsg = await buildEncryptedMessage({
        text: "Mensaje recibido de Lucía",
        sender: peerUser,
        type: "text"
      });

      let capturedDeleteFor: string | null = null;
      server.use(
        http.delete("/api/messages/delete/:chatId/:messageId", ({ request }) => {
          capturedDeleteFor = new URL(request.url).searchParams.get("deleteFor");
          return HttpResponse.json({ data: peerMsg });
        })
      );

      renderMessageItem({ messageData: peerMsg });

      expect(await screen.findByText("Mensaje recibido de Lucía")).toBeInTheDocument();

      await user.click(
        screen.getByRole("button", { name: "Mostrar opciones del mensaje" })
      );

      expect(screen.queryByRole("menuitem", { name: "Editar" })).not.toBeInTheDocument();
      expect(
        screen.queryByRole("menuitem", { name: "Eliminar para todos" })
      ).not.toBeInTheDocument();

      await user.click(screen.getByRole("menuitem", { name: "Eliminar para mí" }));

      await waitFor(() => {
        expect(capturedDeleteFor).toBe("me");
      });
    });

    it("muestra 'Mensaje eliminado' y oculta el menú de opciones cuando deletedForAll es true", async () => {
      const deletedMsg = await buildEncryptedMessage({
        text: "Secreto borrado",
        filesUrls: ["https://ik.imagekit.io/mock/borrada.webp"],
        type: "imageWithText",
        overrides: { deletedForAll: true }
      });

      const { container } = renderMessageItem({ messageData: deletedMsg });

      expect(await screen.findByText("Mensaje eliminado")).toBeInTheDocument();
      expect(screen.queryByText("Secreto borrado")).not.toBeInTheDocument();
      expect(container.querySelector("img")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Mostrar opciones del mensaje" })
      ).not.toBeInTheDocument();
    });
  });

  describe("historial de ediciones (MessageHistoryModal)", () => {
    it("no muestra el botón 'Editado' cuando history está vacío, y al tener historial abre MessageHistoryModal con las versiones descifradas", async () => {
      const user = userEvent.setup();

      // 1. Sin historial: no debe existir el botón "Editado"
      const uneditedMsg = await buildEncryptedMessage({
        text: "Mensaje sin ediciones",
        type: "text"
      });

      const { unmount } = renderMessageItem({ messageData: uneditedMsg });

      expect(await screen.findByText("Mensaje sin ediciones")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Editado" })).not.toBeInTheDocument();
      unmount();

      // 2. Con historial cifrado real: debe mostrar "Editado" y descifrar cada entrada al abrir
      const baseMsg = await buildEncryptedMessage({
        text: "Versión final publicada",
        type: "text"
      });

      const hist1 = await encryptEditedMessage({
        updatedText: "Primera versión borrador",
        message: baseMsg,
        currentUserId: currentUser._id
      });
      const hist2 = await encryptEditedMessage({
        updatedText: "Segunda versión corregida",
        message: baseMsg,
        currentUserId: currentUser._id
      });

      const editedMsg: MessageType = {
        ...baseMsg,
        history: [
          {
            _id: "hist_1",
            previousContent: hist1.updatedMsgEncrypted!,
            iv: hist1.updatedIv!,
            editedAt: "2026-11-20T10:00:00.000Z"
          },
          {
            _id: "hist_2",
            previousContent: hist2.updatedMsgEncrypted!,
            iv: hist2.updatedIv!,
            editedAt: "2026-11-20T11:30:00.000Z"
          }
        ]
      };

      renderMessageItem({ messageData: editedMsg });

      expect(await screen.findByText("Versión final publicada")).toBeInTheDocument();

      const editedBtn = screen.getByRole("button", { name: "Editado" });
      await user.click(editedBtn);

      expect(await screen.findByRole("dialog")).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Historial de cambios" })
      ).toBeInTheDocument();
      expect(await screen.findByText("Primera versión borrador")).toBeInTheDocument();
      expect(await screen.findByText("Segunda versión corregida")).toBeInTheDocument();
    });
  });

  describe("estado 'Visto', emisión de messageSeenBy y chats grupales", () => {
    it("muestra el indicador de visto al remitente solo cuando otro usuario figura en seenBy y nunca emite messageSeenBy", async () => {
      // 1. Mensaje propio aún NO visto (seenBy vacío): no muestra check y no emite messageSeenBy al entrar en viewport
      const unseenOwnMsg = await buildEncryptedMessage({
        text: "Mensaje propio sin leer",
        sender: currentUser,
        overrides: { seenBy: [] }
      });

      const firstRender = renderMessageItem({ messageData: unseenOwnMsg });

      expect(await screen.findByText("Mensaje propio sin leer")).toBeInTheDocument();
      expect(
        firstRender.container.querySelector('[title^="Visto "]')
      ).not.toBeInTheDocument();

      const unseenObservedDiv = firstRender.container.querySelector(
        "li > div"
      ) as HTMLDivElement;
      act(() => {
        io.enterNode(unseenObservedDiv);
      });

      expect(socketMock.emit).not.toHaveBeenCalledWith(
        "messageSeenBy",
        expect.anything()
      );
      firstRender.unmount();

      // 2. Mensaje propio visto por otro usuario: sí muestra check "Visto ..."
      const seenMsg = await buildEncryptedMessage({
        text: "Mensaje leído",
        sender: currentUser,
        overrides: {
          seenBy: [{ user: peerUser, seenAt: "2026-11-23T12:00:00.000Z" }]
        }
      });

      const { container } = renderMessageItem({ messageData: seenMsg });

      expect(await screen.findByText("Mensaje leído")).toBeInTheDocument();
      expect(container.querySelector('[title^="Visto "]')).toBeInTheDocument();
    });

    it("emite socket 'messageSeenBy' cuando un destinatario visualiza un mensaje no visto y muestra el autor en chats grupales", async () => {
      const groupChat = buildMockChat({
        _id: "chat_group_9",
        type: "group",
        groupName: "Grupo QA",
        participants: [currentUser, peerUser]
      });

      const incomingMsg = await buildEncryptedMessage({
        text: "Hola grupo",
        sender: peerUser,
        overrides: {
          _id: "msg_group_incoming_1",
          chat: groupChat._id,
          seenBy: []
        }
      });

      const { container } = renderMessageItem({
        messageData: incomingMsg,
        chatData: groupChat,
        chatType: "group"
      });

      expect(await screen.findByText("Hola grupo")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Lucía Paredes" })).toHaveAttribute(
        "href",
        `/profile/${peerUser.clerkId}`
      );
      expect(container.querySelector('[title^="Visto "]')).not.toBeInTheDocument();

      const observedDiv = container.querySelector("li > div") as HTMLDivElement;
      act(() => {
        io.enterNode(observedDiv);
      });

      await waitFor(() => {
        expect(socketMock.emit).toHaveBeenCalledWith("messageSeenBy", {
          messageId: "msg_group_incoming_1",
          chatId: "chat_group_9",
          userId: currentUser._id
        });
      });
    });
  });
});
