import { useEffect, useRef, type ChangeEvent, type Dispatch, type HTMLAttributes, type SetStateAction, type WheelEvent } from "react";
import Picker from "@emoji-mart/react";
import emojiData from "@emoji-mart/data/sets/15/twitter.json";
import { FaMicrophone } from "react-icons/fa";
import { Smile } from "lucide-react";
import AudioFileItem from "./AudioFileItem";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import useTypingEvent from "@/hooks/useTypingEvent";
import type { ChatType, UserType } from "@/types/global";
import { cn } from "@/lib/utils";

interface Props {
  currentUser: UserType | null;
  chatData: ChatType | null | undefined;
  submitting: boolean;
  messageText: string;
  isRecording?: boolean;
  recordingTime?: string;
  recordedFile?: File | null;
  isSending: boolean;
  clearRecording?: () => void;
  setMessageText: Dispatch<SetStateAction<string>>;
  /** Clases opcionales del textarea */
  className?: HTMLAttributes<HTMLTextAreaElement>["className"];
}

const MessageInputForm = (props: Props) => {
  const { currentUser, chatData, submitting, messageText, isRecording, isSending, recordingTime, clearRecording, recordedFile, setMessageText, className } = props;

  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  // Emitir evento de typing cuando el usuario escribe el mensaje
  const {emitTypingDebounced} = useTypingEvent();

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
    <div className={cn("relative w-full border rounded-full overflow-hidden", (isRecording || recordedFile) ? "border-[#4F39F6]" : "border-input")}>
      {isRecording &&
        <div className="absolute top-0 left-4 flex justify-start items-center gap-2 w-full h-full bg-white z-[100]">
          <FaMicrophone className="size-7 text-[#4F39F6] animate-pulse duration-100" />
          <span className="block text-base text-neutral-700">
            {recordingTime}
          </span>

          <p className="absolute top-1/2 left-[50%] translate-x-[-50%] translate-y-[-50%] w-full text-sm text-center text-neutral-700 font-semibold">
            Grabando audio...
          </p>
        </div>
      }

      {!isRecording && recordedFile && recordingTime && clearRecording &&
        <div className="absolute top-0 left-4 w-full h-full bg-white z-[100]">
          <AudioFileItem
            recordingDuration={recordingTime}
            clearRecording={clearRecording}
            isSending={isSending}
          />
        </div>
      }

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