import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { Image, Mic } from "lucide-react";
import { toast } from "sonner";
import { FaRegCircleStop } from "react-icons/fa6";
import MessageInputForm from "./MessageInputForm";
import UsersTypingIndicator from "./UsersTypingIndicator";
import UsersRecordingAudioIndicator from "./UsersRecordingAudioIndicator";
import SelectedImagesPreviews from "@/components/SelectedImagesPreviews";
import useImagePicker from "@/hooks/useImagePicker";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUsersTyping } from "@/hooks/useUsersTyping";
import { useAudioRecording } from "@/hooks/useAudioRecording";
import { useUsersRecordingAudio } from "@/hooks/useUsersRecordingAudio";
import { errorMessage } from "@/utils/errorMessage";
import { axiosInstance } from "@/utils/axiosInstance";
import { filesUploader } from "@/utils/filesUploader";
import { convertJWKToCryptoKey, encryptHybrid } from "@/utils/hybridCrypto";
import type { ChatType, MessageType } from "@/types/global";

interface Props {
  chatData: ChatType | null | undefined;
  wrapperHeight: number;
  chatTypeParam: "all" | "group" | null;
  recipientsPublicKeys: {userId: string, publicKey: JsonWebKey}[];
  setTemporaryChat: Dispatch<SetStateAction<ChatType | null>>;
}

const ChatInput = ({ chatData, chatTypeParam, recipientsPublicKeys, setTemporaryChat }: Props) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const navigate = useNavigate();

  const [messageText, setMessageText] = useState("");

  const {getToken} = useAuth();

  const queryClient = useQueryClient();

  const {selectedImageFiles, selectedImagePreviews, isProcessing, setSelectedImageFiles, setSelectedImagePreviews, onImagePickHandler} = useImagePicker({fileInputRef});

  const {isRecording, recordingTime, clearRecording, recordedFile, startRecording, stopRecording} = useAudioRecording();

  const {user: currentUser} = useCurrentUser();

  const {usersTyping} = useUsersTyping();

  const {usersRecordingAudio} = useUsersRecordingAudio();

  // Limpiar los estados al salir de la página
  useEffect(() => {
    return () => {
      setMessageText("");
      setSelectedImageFiles([]);
      setSelectedImagePreviews([]);

      if(fileInputRef.current) {
        fileInputRef.current.value = ""
      };
    }
  }, []);

  // Mutation para enviar el mensaje
  const {mutate, isPending: submitting} = useMutation({
    mutationKey: ["send-message", chatData?._id],
    mutationFn: async () => {
      const token1 = await getToken();

      const hasText = messageText.length > 0;
      const hasImages = selectedImageFiles.length > 0;
      const hasAudio = recordedFile;
      const hasFiles = hasImages || hasAudio;
      
      // Subir los archivos a ImageKit si los hay
      const uploadData = hasFiles ? await filesUploader({
        files: recordedFile ? [recordedFile] : selectedImageFiles,
        clerkToken: token1!,
        folderName: `/chats/${chatData?._id}`,
        currentUser
      }) : [];

      const filesUrls = uploadData
      .filter(data => !!data.fileUrl && !!data.fileId)
      .map(data => data.fileUrl) as string[];

      const token2 = await getToken();

      const participants = chatData?.participants.map(user => user._id) || [];

      const senderPublicJWKKey = localStorage.getItem("publicKey");
      let parsedPublicKey: JsonWebKey | null = null;

      if (senderPublicJWKKey) {
        parsedPublicKey = JSON.parse(senderPublicJWKKey);
      }

      if (!parsedPublicKey) {
        throw new Error("No pudimos obtener tus claves de cifrado o aún no las has creado.");
      }

      if (!recipientsPublicKeys.length) {
        throw new Error("Este usuario aún no ha creado sus claves de cifrado.");
      }

      // Convertir las llaves públicas de cifrado de JsonWebKey a CryptoKey
      const senderKey = await convertJWKToCryptoKey(parsedPublicKey, "public");
      const allPublicKeys = [
        {publicKey: senderKey, userId: currentUser?._id || ""}
      ];

      for (const key of recipientsPublicKeys) {
        const userKey = await convertJWKToCryptoKey(key.publicKey, "public");
        
        allPublicKeys.push({
          publicKey: userKey,
          userId: key.userId.replace("temp_", "")
        });
      }

      // Encriptar el mensaje y las urls de los archivos
      const {encryptedMessage, encryptedFileUrls, encryptedKeys, iv} = await encryptHybrid(
        messageText,
        allPublicKeys,
        filesUrls,
      );

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
          Authorization: `Bearer ${token2}`,
          "Content-Type": "application/json"
        }
      });

      return data;
    },
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

  // Filtrar los usuarios que estan escribiendo en el chat activo
  const usersCurrentlyTyping = usersTyping.slice(0, 5).filter(el => {
    return (el.user._id !== currentUser?._id && el.chatId === chatData?._id);
  });

  // Filtrar los usuarios que estan grabando audio en el chat activo
  const usersCurrentlyRecordingAudio = usersRecordingAudio.slice(0, 5).filter(el => {
    return (el.user._id !== currentUser?._id && el.chatId === chatData?._id);
  })

  return (
    <div className="relative flex justify-between items-center gap-1.5 min-[500px]:gap-2 w-full shrink-0 px-1 min-[500px]:px-4 py-2 bg-white border-t">
      {(usersCurrentlyTyping.length > 0 || usersCurrentlyRecordingAudio.length > 0) &&
        <div className="absolute -top-3 left-3 flex flex-col items-start gap-1 px-2 py-1.5 -translate-y-[100%] rounded-lg border shadow bg-slate-200 z-10">
          {/* Mostrar los usuarios que estan escribiendo */}
          <UsersTypingIndicator usersTyping={usersCurrentlyTyping} />

          {/* Mostrar los usuarios que estan grabando notas de voz */}
          <UsersRecordingAudioIndicator usersRecordingAudio={usersCurrentlyRecordingAudio} />
        </div>
      }

      <div className="absolute -top-2 left-1 flex justify-start items-center gap-2 max-w-[80%] bg-white rounded-md translate-x-[24px] -translate-y-[100%] overflow-x-hidden z-50">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
          <SelectedImagesPreviews
            className="bg-[#4F39F6]/20"
            fileInputRef={fileInputRef}
            processingImages={isProcessing}
            isPending={submitting}
            selectedImagePreviews={selectedImagePreviews}
            selectedImageFiles={selectedImageFiles}
            setSelectedImagePreviews={setSelectedImagePreviews}
            setSelectedImageFiles={setSelectedImageFiles}
          />
        </div>
      </div>

      <MessageInputForm
        currentUser={currentUser}
        chatData={chatData}
        messageText={messageText}
        setMessageText={setMessageText}
        submitting={submitting}
        recordingTime={recordingTime}
        isRecording={isRecording}
        clearRecording={clearRecording}
        recordedFile={recordedFile}
        isSending={submitting}
      />

      {messageText.length === 0 && !selectedImageFiles[0] &&
        <div className="flex justify-between items-center gap-1.5 min-[500px]:gap-3">
          {(!isRecording && !recordedFile) &&
            <button
              className="cursor-pointer"
              disabled={submitting}
              onClick={() => fileInputRef.current?.click()}
            >
              <Image className="text-neutral-600" aria-hidden />
              <span className="sr-only">Adjuntar imágenes</span>
            </button>
          }

          {(!isRecording && !recordedFile) &&
            <button
              className="cursor-pointer"
              disabled={submitting}
              onClick={startRecording}
            >
              <Mic className="text-neutral-600" aria-hidden />
              <span className="sr-only">Grabar audio</span>
            </button>
          }

          {isRecording &&
            <button
              className="cursor-pointer"
              disabled={submitting}
              onClick={stopRecording}
            >
              <FaRegCircleStop className="size-6 text-red-700" aria-hidden />
              <span className="sr-only">Detener audio</span>
            </button>
          }
        </div>
      }

      {(messageText.length > 0 || selectedImageFiles[0] || recordedFile) &&
        <button
          className="p-1 text-sm text-blue-700 font-semibold cursor-pointer hover:underline disabled:cursor-not-allowed disabled:text-neutral-400"
          disabled={submitting}
          onClick={() => mutate()}
        >
          { submitting ? "Enviando..." : "Enviar" }
        </button>
      }

      {/* Input oculto del selector de imagen */}
      <input
        ref={fileInputRef}
        type="file"
        hidden
        multiple
        disabled={submitting}
        accept="image/png, image/jpg, image/jpeg, image/webp"
        onChange={onImagePickHandler}
      />
    </div>
  )
}

export default ChatInput