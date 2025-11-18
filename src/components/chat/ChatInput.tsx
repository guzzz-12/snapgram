import { useCallback, useEffect, useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction, type WheelEvent } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import Picker from "@emoji-mart/react";
import emojiData from "@emoji-mart/data/sets/15/twitter.json";
import { Image, Mic, Smile } from "lucide-react";
import { toast } from "sonner";
import { BeatLoader } from "react-spinners";
import SelectedImagesPreviews from "@/components/SelectedImagesPreviews";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import useImagePicker from "@/hooks/useImagePicker";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUsersTyping } from "@/hooks/useUsersTyping";
import { errorMessage } from "@/utils/errorMessage";
import { axiosInstance } from "@/utils/axiosInstance";
import { socket } from "@/utils/socket";
import type { ChatType, MessageType } from "@/types/global";
import type { TypingEventData } from "@/types/socketTypes";

interface Props {
  wrapperHeight: number;
  recipientId: string;
  chatId: string | undefined;
  chatTypeParam: "all" | "group" | null;
  setTemporaryChat: Dispatch<SetStateAction<ChatType | null>>;
}

const ChatInput = ({ wrapperHeight, recipientId, chatId, chatTypeParam, setTemporaryChat }: Props) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stopTypingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const navigate = useNavigate();

  const [messageText, setMessageText] = useState("");

  const {getToken} = useAuth();

  const queryClient = useQueryClient();

  const {selectedImageFiles, selectedImagePreviews, setSelectedImageFiles, setSelectedImagePreviews, onImagePickHandler} = useImagePicker({fileInputRef});

  const {user: currentUser} = useCurrentUser();

  const {usersTyping} = useUsersTyping();

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
    mutationKey: ["send-private-message", chatId],
    mutationFn: async () => {
      const token = await getToken();

      const formData = new FormData();
      formData.append("text", messageText);
      formData.append("recipientId", recipientId);

      if (chatId && !chatId.startsWith("temp_")) {
        formData.append("chatId", chatId);
      }

      selectedImageFiles.forEach(file => formData.append("file", file));

      const {data} = await axiosInstance<{
        data: MessageType;
        isNewChat: boolean;
        chat: ChatType | null;
      }>({
        method: "POST",
        url: `/messages/send-private`,
        data: formData,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });

      return data;
    },
    onSuccess: async (data) => {
      setMessageText("");
      setSelectedImageFiles([]);
      setSelectedImagePreviews([]);

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

  // Función debounced para emitir el evento de typing
  const emitTypingDebounced = useCallback((payload: TypingEventData) => {
    // Reiniciar el timer de typing si existe
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    // Reiniciar el timer de stoppedTyping si existe
    if (stopTypingTimerRef.current) {
      clearTimeout(stopTypingTimerRef.current);
    }

    // Emitir el evento de typing
    typingTimerRef.current = setTimeout(() => {
      socket.emit("typing", payload);
      
      // Emitir el evento de stoppedTyping
      stopTypingTimerRef.current = setTimeout(() => {
        socket.emit("stoppedTyping", {
          chatId: payload.chatId,
          userId: payload.user._id
        });
      }, 1000);

    }, 250);
  }, [socket]);

  // Change handler del textarea
  const onChangeHandler = (e: ChangeEvent<HTMLTextAreaElement>) => {
    if (!currentUser || !chatId) {
      return;
    }

    setMessageText(e.currentTarget.value);

    // Emitir el evento de typing y el evento de stoppedTyping
    emitTypingDebounced({
      chatId,
      user: {
        _id: currentUser._id,
        username: currentUser.username,
        fullName: currentUser.fullName,
        profilePicture: currentUser.profilePicture
      }
    });
  };

  // Detener la propagación del evento scroll del picker al textarea
  // para que el picker sea scrolleable con el mouse
  const handleScrollInterception = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();

    e.stopPropagation(); 

    // Aplicar manualmente el scroll al emoji picker
    e.currentTarget.scrollTop += e.deltaY;
  };

  // Filtrar los usuarios que estan escribiendo en el chat activo
  const usersCurrentlyTyping = usersTyping.filter(el => {
    return (el.user._id !== currentUser?._id && el.chatId === chatId);
  });

  return (
    <div
      style={{height: `${wrapperHeight}px`}}
      className="relative flex justify-between items-center gap-3 w-full shrink-0 px-6 py-4 bg-white border-t"
    >
      {/* Mostrar los usuarios que estan escribiendo */}
      {usersCurrentlyTyping.length > 0 &&
        <div className="absolute -top-3 left-3 flex justify-center items-center px-2 py-1.5 -translate-y-[100%] rounded-lg border shadow bg-slate-200 z-10">
          <div className="flex flex-col gap-2">
            {usersCurrentlyTyping.slice(0, 5).map((el) => (
              <div
                key={el.user._id}
                className="flex justify-start items-center gap-2"
              >
                <Avatar className="w-5 h-5 shrink-0 outline-2 outline-white">
                  <AvatarImage
                    className="w-full h-full object-cover"
                    src={el.user.profilePicture}
                  />

                  <AvatarFallback className="w-full h-full object-cover">
                    {el.user.fullName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <BeatLoader
                  className="opacity-80"
                  size={9}
                  color="#4F39F6"
                  speedMultiplier={0.8}
                />
              </div>
            ))}
          </div>
        </div>
      }

      {selectedImagePreviews.length > 0 &&
        <div className="absolute -top-1 left-1 flex justify-start items-center gap-2 max-w-[80%] bg-slate-100 shadow border rounded-md translate-x-[24px] -translate-y-[100%] overflow-x-hidden z-50">
          <div className="px-4 py-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
            <SelectedImagesPreviews
              fileInputRef={fileInputRef}
              isPending={submitting}
              selectedImagePreviews={selectedImagePreviews}
              selectedImageFiles={selectedImageFiles}
              setSelectedImagePreviews={setSelectedImagePreviews}
              setSelectedImageFiles={setSelectedImageFiles}
            />
          </div>
        </div>
      }

      <div className="relative w-full border rounded-full overflow-hidden">
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="absolute left-4 top-1/2 shrink-0 -translate-y-1/2 cursor-pointer"
              disabled={submitting}
            >
              <Smile className="text-neutral-600" aria-hidden />
              <span className="sr-only">Seleccionar Emoji</span>
            </button>
          </PopoverTrigger>

          <PopoverContent
            className="w-full p-0 -translate-y-[1rem] bg-transparent"
            onWheel={handleScrollInterception}
          >
            <Picker
              locale="es"
              emojiVersion="15"
              set="twitter"
              previewPosition="none"
              navPosition="bottom"
              data={emojiData}
              onEmojiSelect={(emoji: any) => {
                setMessageText((prev) => prev + emoji.native)
              }}
            />
          </PopoverContent>
        </Popover>

        <Textarea
          className="w-full min-h-full max-h-[80px] pl-12 border-none rounded-full resize-none scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-white"
          placeholder="Escribe algo..."
          disabled={submitting}
          value={messageText}
          onChange={onChangeHandler}
        />
      </div>

      {messageText.length === 0 && !selectedImageFiles[0] &&
        <div className="flex justify-between items-center gap-3">
          <button
            className="cursor-pointer"
            disabled={submitting}
            onClick={() => fileInputRef.current?.click()}
          >
            <Image className="text-neutral-600" aria-hidden />
            <span className="sr-only">Adjuntar imágenes</span>
          </button>

          <button
            className="cursor-pointer"
            disabled={submitting}
          >
            <Mic className="text-neutral-600" aria-hidden />
            <span className="sr-only">Enviar audio</span>
          </button>
        </div>
      }

      {(messageText.length > 0 || selectedImageFiles[0]) &&
        <button
          className="p-1 text-sm text-blue-700 font-semibold cursor-pointer hover:underline"
          disabled={submitting}
          onClick={() => mutate()}
        >
          Enviar
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