import { useCallback, useEffect, useRef, type ChangeEvent, type Dispatch, type HTMLAttributes, type SetStateAction, type WheelEvent } from "react";
import Picker from "@emoji-mart/react";
import emojiData from "@emoji-mart/data/sets/15/twitter.json";
import { Smile } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import type { TypingEventData } from "@/types/socketTypes";
import { socket } from "@/utils/socket";
import type { ChatType, UserType } from "@/types/global";
import { cn } from "@/lib/utils";

interface Props {
  currentUser: UserType | null;
  chatData: ChatType | null | undefined;
  submitting: boolean;
  messageText: string;
  setMessageText: Dispatch<SetStateAction<string>>;
  /** Clases opcionales del textarea */
  className?: HTMLAttributes<HTMLTextAreaElement>["className"];
}

const MessageInputForm = (props: Props) => {
  const { currentUser, chatData, submitting, messageText, setMessageText, className } = props;

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stopTypingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Hacer focus en el input al montar
  useEffect(() => {
    const timeout = setTimeout(() => {
      const textarea = inputRef.current!;

      textarea.focus();

      const contentLength = textarea.value.length;

      textarea.setSelectionRange(contentLength, contentLength);
    }, 250);

    return () => {
      clearTimeout(timeout);
      setMessageText("");
    };
  }, []);

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
    if (!currentUser || !chatData) {
      return;
    }

    setMessageText(e.currentTarget.value);

    // Emitir el evento de typing y el evento de stoppedTyping
    emitTypingDebounced({
      chatId: chatData._id,
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

  return (
    <div className={cn("relative w-full border rounded-full overflow-hidden")}>
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
        ref={inputRef}
        className={cn("w-full min-h-full max-h-[80px] pl-12 border-none rounded-full resize-none scrollbar-none placeholder:whitespace-nowrap", className)}
        placeholder="Escribe algo..."
        disabled={submitting}
        value={messageText}
        onChange={onChangeHandler}
      />
    </div>
  )
}

export default MessageInputForm