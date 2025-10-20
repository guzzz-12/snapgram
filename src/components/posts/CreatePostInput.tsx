import { useEffect, useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction } from "react";
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react";
import { Smile } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Props {
  textContent: string;
  isPending: boolean;
  setTextContent: Dispatch<SetStateAction<string>>;
}

const CreatePostInput = ({ textContent, isPending, setTextContent }: Props) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [caretPosition, setCaretPosition] = useState(0);

  // Hacer autoFocus en el textarea
  useEffect(() => {
    const timeout = setTimeout(() => {
      const textarea = inputRef.current!;

      textarea.focus();

      const contentLength = textarea.value.length;

      textarea.setSelectionRange(contentLength, contentLength);
    }, 0);

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  const onChangeHandler = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.currentTarget.value;
    const caretPosition = e.target.selectionStart;

    setTextContent(value);
    setCaretPosition(caretPosition);
  }
  
  // Insertar el emoji en la posición del cursor
  const onEmojiPickHandler = (e: EmojiClickData) => {
    const value = textContent.slice(0, caretPosition) + e.emoji + textContent.slice(caretPosition);
    setTextContent(value);
  }

  return (
    <div className="relative flex justify-start items-start gap-3 w-full max-h-[420px] border-b overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
      <Textarea
        ref={inputRef}
        className="w-full px-0 py-4 !text-base border-t-0 border-b-0 border-l-0 border-r-0 rounded-none shadow-none resize-none placeholder:text-neutral-400 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent focus-visible:border-b"
        placeholder="¿Qué estás pensando?"
        disabled={isPending}
        value={textContent}
        onChange={onChangeHandler}
        onClick={(e) => {
          // Actualizar el state de la posición del cursor al clickear en el textarea
          const caretPosition = e.currentTarget.selectionStart;
          setCaretPosition(caretPosition);
        }}
      />

      <div className="sticky top-[50%] right-1 flex justify-center items-center h-full shrink-0 translate-y-[-50%] z-10">
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="shrink-0 cursor-pointer"
              disabled={isPending}
            >
              <Smile className="size-6 text-neutral-600" aria-hidden />
              <span className="sr-only">Seleccionar Emoji</span>
            </button>
          </PopoverTrigger>

          <PopoverContent
            className="w-full h-full p-0 -translate-y-[1rem] bg-transparent"
            side="left"
          >
            <EmojiPicker
              searchDisabled
              onEmojiClick={onEmojiPickHandler}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}

export default CreatePostInput