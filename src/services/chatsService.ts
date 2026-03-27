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
  chatData: ChatType | null | undefined;
  selectedImageFiles: File[];
  recordedFile: File | null;
  currentUser: UserType | null;
  chatTypeParam: "all" | "group" | null | undefined;
  recipientsPublicKeys: PublicKeysType[];
  getToken: () => Promise<string | null>;
}

type UpdateGroupParams = {
  groupId: string | undefined;
  groupName: string;
  groupDescription: string;
}

/** Services de los chats y grupos */
export const useChatsService = () => {
  const navigate = useNavigate();

  const { getToken } = useAuth();

  const queryClient = useQueryClient();

  return {
    /** Service para consultar un chat especifico por su ID */
    getChatById: (chatId: string | undefined) => {
      const res = useQuery({
        queryKey: ["chat", chatId],
        queryFn: () => fetchChatById(chatId, getToken),
        enabled: !!chatId && !chatId.startsWith("temp_"),
        refetchOnWindowFocus: false
      });

      const {data, isFetching, error} = res;

      return {
        existingChat: data?.chatData,
        blockData: data?.isBlocked,
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

      return {
        messages,
        isLoadingMessages,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
        error
      };
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
      const {
        chatData,
        selectedImageFiles,
        recordedFile,
        currentUser,
        chatTypeParam,
        recipientsPublicKeys
      } = params;

      const {mutate, isPending: submitting} = useMutation({
        mutationKey: ["send-message", chatData?._id],
        mutationFn: async ({messageText}: {messageText: string; onSuccess?: () => void}) => sendMessageFn({
          messageText,
          chatData,
          selectedImageFiles,
          recordedFile,
          getToken,
          currentUser,
          recipientsPublicKeys
        }),
        onSuccess: async (data, {onSuccess}) => {
          onSuccess?.();
    
          if (data.isNewChat) {
            await queryClient.invalidateQueries({queryKey: ["chats", chatTypeParam || "all"]});

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
    getPrivateChatByRecipient: (selectedUserId: string | null | undefined) => {
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
    addMemberToGroup: (params: {chatId: string | undefined; selectedUserId: string | null}) => {
      const {chatId, selectedUserId} = params;

      const {mutate, isPending} = useMutation({
        mutationFn: async (_props: {onSuccess?: () => void}) => addMemberToGroupFn({chatId, selectedUserId, getToken}),
        onSuccess: async (_data, {onSuccess}) => {
          await queryClient.invalidateQueries({queryKey: ["recipientsCryptoKeys", chatId]});

          onSuccess?.();
        },
        onError: (error) => {
          toast.error(errorMessage(error));
        }
      });

      return {mutate, isPending};
    },

    /** Service para consultar las claves publicas de los miembros del chat */
    getRecipientsPublicKeys: (chat: ChatType | null | undefined) => {
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

          return data;
        },
        retry: 1,
        enabled: !!chat && isNotTempChat,
        refetchOnWindowFocus: false
      });

      return {
        publicKeys: res.data?.publicKeys,
        loadingRecipientsCryptoKey: res.isLoading
      };
    },

    /** Service para consultar la clave publica del chat temporal */
    getTempChatPublicKey: (chat: ChatType | null | undefined) => {
      const isTempChat = Boolean(chat && chat._id.startsWith("temp_"));

      const {data, isLoading} = useQuery({
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

          return data;
        },
        enabled: isTempChat,
        retry: 1,
        refetchOnWindowFocus: false
      });

      const publicKey = data ? [{publicKey: data.data, userId: chat!._id}] : undefined;

      return {
        tempChatPublicKey: publicKey,
        loadingTempChatPublicKey: isLoading
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
      const {groupId, groupName, groupDescription} = params;

      const {mutate: updateGroupInfoMutation, isPending: isUpdating} = useMutation({
        mutationFn: (_props: {onSuccess?: () => void}) => updateGroupInfoFn({groupId, groupName, groupDescription, getToken}),
        onSuccess: async (_data, {onSuccess}) => {
          await queryClient.invalidateQueries({queryKey: ["groupInfo", groupId]});

          onSuccess?.();
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