import { axiosInstance } from "@/utils/axiosInstance";
import type { ChatType, MessageType, UserType } from "@/types/global";
import { filesUploader } from "@/utils/filesUploader";
import { encryptMsgContent } from "@/utils/encryptMsgContent";

export type PublicKeysType = { userId: string, publicKey: JsonWebKey }

type SendMessageParams = {
  messageText: string;
  chatData: ChatType | null | undefined;
  selectedImageFiles: File[];
  recordedFile: File | null;
  currentUser: UserType | null;
  recipientsPublicKeys: PublicKeysType[];
}

/** Función para consultar un chat mediante su ID */
export const fetchChatById = async (chatId: string | undefined) => {

  const {data} = await axiosInstance<{
    data: ChatType;
    isBlocked: {
      blockedBy: string | null;
      blockedUser: string | null;
    };
  }>({
    method: "GET",
    url: `/chats/${chatId}`
  });

  const chatData = data.data;
  const isBlocked = data.isBlocked;

  return {chatData, isBlocked};
}

/** Función para consultar los chats (tanto privados como grupales) */
export const fetchChats = async (
  page: number,
  type: "all" | "group" | "private" | null | undefined
) => {

  const {data} = await axiosInstance<{
    data: ChatType[];
    hasMore: boolean;
    nextPage: number | null;
  }>({
    method: "GET",
    url: "/chats",
    params: {
      page,
      limit: 10,
      type: type ?? "all"
    }
  });

  return data;
}


/** Función para consultar los mensajes de un chat */
export const fetchChatMessages = async (chatId: string | undefined, page: number) => {

  const {data} = await axiosInstance<{
    data: {
      messages: MessageType[];
      chat: ChatType;
    }
    hasMore: boolean;
    nextPage: number | null;
  }>({
    method: "GET",
    url: `/messages/chat/${chatId}`,
    params: {
      page,
      limit: 10
    }
  });

  return data;
};


/** Función para consultar los usuarios que pueden ser agregados al chat */
export const fetchUsersToChat = async (page: number, keyword: string | undefined) => {

  const {data} = await axiosInstance<{
    data: UserType[];
    hasMore: boolean;
    nextPage: number | null;
  }>({
    method: "GET",
    url: "/users/search",
    params: {
      page,
      limit: 10,
      keyword
    }
  });

  return data;
}


/** Función para enviar un mensaje */
export const sendMessageFn = async (params: SendMessageParams) => {
  const {messageText, chatData, selectedImageFiles, recordedFile, currentUser, recipientsPublicKeys} = params;

  const hasText = messageText.length > 0;
  const hasImages = selectedImageFiles.length > 0;
  const hasAudio = recordedFile;
  const hasFiles = hasImages || hasAudio;
  
  // Subir los archivos a ImageKit si los hay
  const uploadData = hasFiles ? await filesUploader({
    files: recordedFile ? [recordedFile] : selectedImageFiles,
    folderName: `/chats/${chatData?._id}`,
    currentUser
  }) : [];

  const filesUrls = uploadData
  .filter(data => !!data.fileUrl && !!data.fileId)
  .map(data => data.fileUrl) as string[];

  const participants = chatData?.participants.map(user => user._id) || [];

  // Encriptar el mensaje, las urls de los archivos y las llaves de cifrado
  const {encryptedMessage, encryptedFileUrls, encryptedKeys, iv} = await encryptMsgContent({
    text: messageText,
    recipientsPublicKeys,
    currentUser,
    filesUrls
  });

  const {data} = await axiosInstance<{
    data: MessageType;
    isNewChat: boolean;
    chat: ChatType | null;
  }>({
    method: "POST",
    url: `/messages/send`,
    data: {
      text: encryptedMessage,
      chatId: chatData?._id,
      recipientIds: participants,
      type: hasText && hasImages ? "imageWithText" : hasImages ? "image" : hasAudio ? "audio" : "text",
      fileUrls: encryptedFileUrls,
      fileIds: uploadData.map(uData => uData.fileId),
      encryptedKeys,
      initVector: iv
    },
    headers: {
      "Content-Type": "application/json"
    }
  });

  return data;
}


/** Funcion para obtener un chat privado mediante el ID del usuario recipiente */
export const fetchPrivateChatByParticipant = async (
  params: {
    selectedUserId: string | null | undefined;
  }
) => {
  const {selectedUserId} = params;

  const {data} = await axiosInstance<{data: ChatType; isChatRestored: boolean}>({
    method: "GET",
    url: `/chats/participant/${selectedUserId}`
  });

  return data;
}


/** Funcion para agregar un nuevo miembro al grupo */
export const addMemberToGroupFn = async (params: {chatId: string | undefined; selectedUserId: string | null}) => {
  const {chatId, selectedUserId} = params;

  const {data} = await axiosInstance<{data: ChatType}>({
    method: "PUT",
    url: `/chats/group/${chatId}/add-members`,
    data: {
      newMember: selectedUserId
    }
  });

  return data;
}


/** Funcion para actualizar la informacion de un grupo */
export const updateGroupInfoFn = async (params: {groupId: string | undefined; groupName: string; groupDescription: string}) => {
  const {groupId, groupName, groupDescription} = params;

  const {data} = await axiosInstance<{data: ChatType}>({
    method: "PUT",
    url: `/chats/group/${groupId}/update-info`,
    data: {
      groupName,
      groupDescription
    }
  });

  return data.data;
}