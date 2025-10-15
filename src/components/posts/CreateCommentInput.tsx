import { type Dispatch, type HTMLAttributes, type SetStateAction } from "react";
import EmojiPicker from "emoji-picker-react";
import { Smile } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Textarea } from "../ui/textarea";
import { cn } from "@/lib/utils";

interface Props {
  textContent: string;
  isPending: boolean;
  placeholder?: string;
  className?: HTMLAttributes<HTMLElement>["className"];
  setTextContent: Dispatch<SetStateAction<string>>;
}

const CreateCommentInput = ({textContent, isPending, placeholder, className, setTextContent} : Props) => {
  return (
    <div className="relative w-full border rounded-sm overflow-hidden">
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="absolute left-4 top-1/2 shrink-0 -translate-y-1/2 cursor-pointer"
            disabled={isPending}
          >
            <Smile className="text-neutral-600" aria-hidden />
            <span className="sr-only">Seleccionar Emoji</span>
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-full p-0 -translate-y-[1rem] bg-transparent">
          <EmojiPicker
            searchDisabled
            onEmojiClick={(e) => setTextContent((prev) => prev + e.emoji)}
          />
        </PopoverContent>
      </Popover>

      <Textarea
        className={cn("w-full min-h-auto max-h-[150px] pl-12 py-4 bg-white border-none rounded-sm resize-none scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-white", className)}
        placeholder={placeholder || "Escribe un comentario..."}
        disabled={isPending}
        value={textContent}
        onChange={(e) => setTextContent(e.target.value)}
      />
    </div>
  )
}

export default CreateCommentInput