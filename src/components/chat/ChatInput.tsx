import { useEffect, useRef, useState, type Dispatch, type SetStateAction, type WheelEvent } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import Picker from "@emoji-mart/react";
import emojiData from "@emoji-mart/data/sets/15/twitter.json";
import { Image, Mic, Smile, X } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import useImagePicker from "@/hooks/useImagePicker";
import { errorMessage } from "@/utils/errorMessage";
import { axiosInstance } from "@/utils/axiosInstance";
import type { ChatType, MessageType } from "@/types/global";

interface Props {
  wrapperHeight: number;
  recipientId: string;
  chatId: string | undefined;
  setTemporaryChat: Dispatch<SetStateAction<ChatType | null>>
}

const ChatInput = ({ wrapperHeight, recipientId, chatId, setTemporaryChat }: Props) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const navigate = useNavigate();

  const [messageText, setMessageText] = useState("");

  const {getToken} = useAuth();

  const queryClient = useQueryClient();

  const {selectedImageFiles, selectedImagePreviews, setSelectedImageFiles, setSelectedImagePreviews, onImagePickHandler} = useImagePicker({fileInputRef});

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
        await queryClient.invalidateQueries({queryKey: ["chats"]});
        setTemporaryChat(null);
        navigate(`/messages/${data.chat!._id}`, {replace: true});
      }
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });

  // Detener la propagación del evento scroll del picker al textarea
  // para que el picker sea scrolleable con el mouse
  const handleScrollInterception = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();

    e.stopPropagation(); 

    // Aplicar manualmente el scroll al emoji picker
    e.currentTarget.scrollTop += e.deltaY;
  };

  return (
    <div
      style={{height: `${wrapperHeight}px`}}
      className="relative flex justify-between items-center gap-3 w-full shrink-0 px-6 py-4 bg-white"
    >
      {selectedImagePreviews.length > 0 &&
        <div className="absolute -top-1 right-1 p-1.5 -translate-x-[100%] -translate-y-[100%] bg-neutral-300 rounded-sm shadow overflow-hidden">
          <button
            className="absolute top-1 right-1 p-0.5 rounded-full bg-red-50 cursor-pointer"
            onClick={() => {
              setSelectedImageFiles([]);
              setSelectedImagePreviews([]);
            }}
          >
            <X className="text-destructive" aria-hidden />
            <span className="sr-only">Eliminar imagen</span>
          </button>

          <img
            src={selectedImagePreviews[0]}
            className="w-[80px] h-[80px] object-cover"
          />
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
          onChange={(e) => setMessageText(e.target.value)}
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
            <span className="sr-only">Seleccionar imagen</span>
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
          multiple={false}
          disabled={submitting}
          accept="image/png, image/jpg, image/jpeg, image/webp"
          onChange={onImagePickHandler}
        />
    </div>
  )
}

export default ChatInput