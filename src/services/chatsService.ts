import { type RefObject } from "react";
import { useNavigate } from "react-router";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";
import { addMemberToGroupFn, fetchChatById, fetchChatMessages, fetchChats, fetchPrivateChatByParticipant, fetchUsersToChat, sendMessageFn, updateGroupInfoFn, type PublicKeysType } from "@/repositories/chatsRepository";
import { restoreDeletedChatCache } from "@/utils/updateMsgsDataCache";
import { errorMessage } from "@/utils/errorMessage";
import { axiosInstance } from "@/utils/axiosInstance";
import type { ChatType, UserType } from "@/types/global";

type SendMessageParams = {
  messageText: string;
  chatData: ChatType | null | undefined;
  selectedImageFiles: File[];
  recordedFile: File | null;
  currentUser: UserType | null;
  chatTypeParam: "all" | "group" | null | undefined;
  recipientsPublicKeys: PublicKeysType[];
  fileInputRef: RefObject<HTMLInputElement | null>;
  getToken: () => Promise<string | null>;
  setTemporaryChat: (chat: ChatType | null) => void;
  setMessageText: (text: string) => void;
  setSelectedImageFiles: (files: File[]) => void;
  setSelectedImagePreviews: (previews: string[]) => void;
  clearRecording: () => void;
}

type UpdateGroupParams = {
  groupId: string | undefined;
  groupName: string;
  groupDescription: string;
  setIsEditingGroupName: (value: boolean) => void;
  setIsEditingGroupDescription: (value: boolean) => void;
}

/** Services de los chats y grupos */
export const useChatsService = () => {
  const navigate = useNavigate();

  const { getToken } = useAuth();

  const queryClient = useQueryClient();

  return {
    /** Service para consultar un chat especifico por su ID */
    getChatById: (
      chatId: string | undefined,
      setIsBlocked: (data: { blockedBy: string | null; blockedUser: string | null }) => void,
      setTemporaryChat: (chat: ChatType | null) => void
    ) => {
      const res = useQuery({
        queryKey: ["chat", chatId],
        queryFn: () => fetchChatById(chatId, setIsBlocked, setTemporaryChat, getToken),
        enabled: !!chatId && !chatId.startsWith("temp_"),
        refetchOnWindowFocus: false
      });

      const {data, isFetching, error} = res;

      return {
        existingChat: data,
        fetchingExistingChat: isFetching,
        chatError: error
      };
    },

    /** Service para consultar los chats del usuario */
    getChats: (
      chatTypeParam: "all" | "group" | null | undefined,
      chatId: string | undefined,
      hasLocalCryptoKeys: boolean
    ) => {
      const res = useInfiniteQuery({
        queryKey: ["chats", chatTypeParam || "all"],
        queryFn: ({pageParam}) => fetchChats(pageParam, chatTypeParam, getToken),
        initialPageParam: 1,
        getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
        refetchOnWindowFocus: false,
        enabled: hasLocalCryptoKeys && (!!chatTypeParam || !!chatId)
      });

      const {data, error, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} = res;

      const chats = data?.pages.flatMap((page) => page.data) || [];

      return {chats, error, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage};
    },

    /** Service para consultar los mensajes de un chat */
    getChatMessages: (params: { chatId: string | undefined; isLoadingChatData: boolean}) => {
      const {chatId, isLoadingChatData} = params;

      const res = useInfiniteQuery({
        queryKey: ["messages", chatId],
        queryFn: ({pageParam}) => fetchChatMessages(chatId, pageParam, getToken),
        initialPageParam: 1,
        getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
        enabled: !isLoadingChatData && !!chatId && !chatId.startsWith("temp_"),
        retry: 2,
        refetchOnWindowFocus: false,
      });

      const {data: messagesData, isLoading: isLoadingMessages, isFetchingNextPage, hasNextPage, fetchNextPage, error} = res;

      // Invertir el orden de los mensajes
      // para corregir la dirección de la paginación
      const messages = messagesData?.pages.flatMap((page) => page.data.messages).reverse() || [];

      return {messages, isLoadingMessages, isFetchingNextPage, hasNextPage, fetchNextPage, error};
    },

    /** Service para consultar los usuarios que pueden ser agregados al chat */
    getUsersToChat: ({ isOpen, keyword }: { isOpen: boolean; keyword?: string }) => {
      const res = useInfiniteQuery({
        queryKey: ["get-users-list", keyword],
        initialPageParam: 1,
        queryFn: ({pageParam}) => fetchUsersToChat(pageParam, keyword, getToken),
        getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
        refetchOnWindowFocus: false,
        enabled: isOpen
      });

      const usersData = res.data?.pages.flatMap((page) => page.data) ?? [];

      return {
        usersData,
        usersError: res.error,
        isLoading: res.isLoading,
        isFetchingNextPage: res.isFetchingNextPage,
        hasNextPage: res.hasNextPage,
        fetchNextPage: res.fetchNextPage
      };
    },

    /** Enviar un mensaje en un chat (privado o grupal) */
    sendMessage: (params: SendMessageParams) => {
      const {messageText, chatData, selectedImageFiles, recordedFile, currentUser, chatTypeParam, recipientsPublicKeys, setTemporaryChat, setMessageText, setSelectedImageFiles, setSelectedImagePreviews, clearRecording, fileInputRef} = params;

      const {mutate, isPending: submitting} = useMutation({
        mutationKey: ["send-message", chatData?._id],
        mutationFn: async () => sendMessageFn({
          messageText,
          chatData,
          selectedImageFiles,
          recordedFile,
          getToken,
          currentUser,
          recipientsPublicKeys
        }),
        onSuccess: async (data) => {
          setMessageText("");
          setSelectedImageFiles([]);
          setSelectedImagePreviews([]);
          clearRecording();
    
          if(fileInputRef.current) {
            fileInputRef.current.value = ""
          };
    
          if (data.isNewChat) {
            await queryClient.invalidateQueries({queryKey: ["chats", chatTypeParam || "all"]});

            setTemporaryChat(null);

            navigate(`/messages/${data.chat!._id}`, {replace: true});
          }
        },
        onError: (error) => {
          toast.error(errorMessage(error));
        },
      });

      return {mutate, submitting};
    },

    /** Service para consultar el chat con el usuario seleccionado */
    getPrivateChatByRecipient: (selectedUserId: string | null) => {
      const res = useQuery({
        queryKey: ["get-private-chat-by-participant", selectedUserId],
        queryFn: async () => fetchPrivateChatByParticipant({selectedUserId, getToken}),
        enabled: !!selectedUserId
      });

      const {data, refetch, isRefetching: isLoadingChat, error: loadingChatError} = res;

      // Agregar el nuevo chat a la lista de chats del usuario recipiente
      // al recibir el primer mensaje de un chat que aun no existe en su lista
      if (data && data.isChatRestored) {
        restoreDeletedChatCache({queryClient, restoredChat: data.data});
      }

      return {refetch, isLoadingChat, loadingChatError};
    },

    /** Service para agregar un nuevo miembro al grupo */
    addMemberToGroup: (params: {chatId: string | undefined; selectedUserId: string | null; setIsOpen: (isOpen: boolean) => void}) => {
      const {chatId, selectedUserId, setIsOpen} = params;

      const {mutate, isPending} = useMutation({
        mutationFn: async () => addMemberToGroupFn({chatId, selectedUserId, getToken}),
        onSuccess: async () => {
          await queryClient.invalidateQueries({queryKey: ["recipientsCryptoKeys", chatId]});

          setIsOpen(false);
          
          toast.success("Usuario agregado con éxito");
        },
        onError: (error) => {
          toast.error(errorMessage(error));
        }
      });

      return {mutate, isPending};
    },

    /** Service para consultar las claves publicas de los miembros del chat */
    getRecipientsPublicKeys: (
      chat: ChatType | null | undefined,
      setPublicKeys: (publicKeys: PublicKeysType[]) => void
    ) => {
      const isNotTempChat = Boolean(chat && !chat._id.startsWith("temp_"));

      const res = useQuery({
        queryKey: ["recipientsCryptoKeys", chat?._id],
        queryFn: async () => {
          const token = await getToken();

          const {data} = await axiosInstance<{publicKeys: PublicKeysType[]}>({
            method: "GET",
            url: `/crypto-keys/get-recipients-public-keys/${chat?._id}`,
            headers: {
              Authorization: `Bearer ${token}`
            }
          });

          setPublicKeys(data.publicKeys);

          return data;
        },
        retry: 1,
        enabled: !!chat && isNotTempChat,
        refetchOnWindowFocus: false
      });

      return {
        loadingRecipientsCryptoKey: res.isLoading
      };
    },

    /** Service para consultar la clave publica del chat temporal */
    getTempChatPublicKey: (
      chat: ChatType | null | undefined,
      setPublicKeys: (publicKeys: PublicKeysType[]) => void
    ) => {
      const isTempChat = Boolean(chat && chat._id.startsWith("temp_"));

      const res = useQuery({
        queryKey: ["tempChatPublicKey", chat?._id],
        queryFn: async () => {
          const token = await getToken();

          const {data} = await axiosInstance<{data: JsonWebKey}>({
            method: "GET",
            url: `/crypto-keys/get-user-public-key/${chat?._id.replace("temp_", "")}`,
            headers: {
              Authorization: `Bearer ${token}`
            }
          });

          setPublicKeys([{publicKey: data.data, userId: chat!._id}]);

          return data;
        },
        enabled: isTempChat,
        retry: 1,
        refetchOnWindowFocus: false
      });

      return {
        loadingTempChatPublicKey: res.isLoading
      };
    },

    /** Service para consultar la información de un grupo */
    getGroupInfo: (groupId: string | undefined, isOpen: boolean) => {
      const res = useQuery({
        queryKey: ["groupInfo", groupId],
        queryFn: async () => {
          const token = await getToken();
          
          const {data} = await axiosInstance<{data: ChatType}>({
            method: "GET",
            url: `/chats/${groupId}`,
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
    
          return data.data;
        },
        enabled: isOpen && !!groupId
      });

      return {
        data: res.data,
        isLoading: res.isLoading,
        error: res.error
      }
    },

    /** Service para actualizar la informacion de un grupo */
    updateGroupInfo: (params: UpdateGroupParams) => {
      const {groupId, groupName, groupDescription, setIsEditingGroupName, setIsEditingGroupDescription} = params;

      const {mutate: updateGroupInfoMutation, isPending: isUpdating} = useMutation({
        mutationFn: () => updateGroupInfoFn({groupId, groupName, groupDescription, getToken}),
        onSuccess: async () => {
          await queryClient.invalidateQueries({queryKey: ["groupInfo", groupId]});

          setIsEditingGroupName(false);

          setIsEditingGroupDescription(false);

          toast.success("Grupo actualizado con éxito");
        },
        onError: (error) => {
          toast.error(errorMessage(error));
        }
      });

      return {updateGroupInfoMutation, isUpdating};
    },

    /** Service para eliminar un grupo */
    deleteGroup: (groupData: ChatType | null | undefined) => {
      const {mutate, isPending} = useMutation({
        mutationFn: async () => {
          if (!groupData) return;

          const token = await getToken();

          const {data} = await axiosInstance<{data: ChatType}>({
            method: "DELETE",
            url: `/chats/group/${groupData._id}`,
            headers: {
              Authorization: `Bearer ${token}`
            }
          });

          return data.data;
        },
        onSuccess: async () => {
          await queryClient.invalidateQueries({queryKey: ["chats", "all"]});

          navigate("/messages?type=all", {replace: true});

          toast.success("Grupo eliminado con éxito");
        },
        onError: (error) => {
          toast.error(errorMessage(error));
        }
      });

      return {mutate, isPending};
    }
  }
}