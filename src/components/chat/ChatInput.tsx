import { useEffect, useRef, useState } from "react";
import MessageInputForm from "./MessageInputForm";
import UsersTypingIndicator from "./UsersTypingIndicator";
import UsersRecordingAudioIndicator from "./UsersRecordingAudioIndicator";
import ChatInputMediaBtns from "./ChatInputMediaBtns";
import SelectedImagesPreviews from "@/components/SelectedImagesPreviews";
import { useSendMessage } from "@/services/chats";
import useImagePicker from "@/hooks/useImagePicker";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUsersTyping } from "@/hooks/useUsersTyping";
import { useAudioRecording } from "@/hooks/useAudioRecording";
import { useUsersRecordingAudio } from "@/hooks/useUsersRecordingAudio";
import { useTemporaryChat } from "@/hooks/useTemporaryChat";
import type { PublicKeysType } from "@/repositories/chatsRepository";
import type { ChatType } from "@/types/global";

interface Props {
  chatData: ChatType | null | undefined;
  wrapperHeight: number;
  chatTypeParam: "all" | "group" | null;
  recipientsPublicKeys: PublicKeysType[];
}

const ChatInput = ({ chatData, chatTypeParam, recipientsPublicKeys }: Props) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [messageText, setMessageText] = useState("");

  const {selectedImageFiles, selectedImagePreviews, isProcessing, setSelectedImageFiles, setSelectedImagePreviews, onImagePickHandler} = useImagePicker({fileInputRef});

  const {
    isRecording,
    recordingTime,
    clearRecording,
    recordedFile,
    startRecording,
    stopRecording
  } = useAudioRecording();

  const {user: currentUser} = useCurrentUser();

  const {setChat: setTemporaryChat} = useTemporaryChat();

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
  const {mutate, submitting} = useSendMessage({
    chatData,
    selectedImageFiles,
    recordedFile,
    currentUser,
    recipientsPublicKeys,
    chatTypeParam,
  });

  const onSendMessageHandler = () => {
    mutate({
      messageText,
      onSuccess: () => {
        setMessageText("");
        setSelectedImageFiles([]);
        setSelectedImagePreviews([]);
        setTemporaryChat(null);
        clearRecording();
  
        if(fileInputRef.current) {
          fileInputRef.current.value = ""
        };
      }
    })
  }

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

      <ChatInputMediaBtns
        messageText={messageText}
        selectedImageFiles={selectedImageFiles}
        isRecording={isRecording}
        recordedFile={recordedFile}
        submitting={submitting}
        fileInputRef={fileInputRef}
        startRecording={startRecording}
        stopRecording={stopRecording}
      />

      {(messageText.length > 0 || selectedImageFiles[0] || recordedFile) &&
        <button
          className="p-1 text-sm text-blue-700 font-semibold cursor-pointer hover:underline disabled:cursor-not-allowed disabled:text-neutral-400"
          disabled={submitting}
          onClick={onSendMessageHandler}
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