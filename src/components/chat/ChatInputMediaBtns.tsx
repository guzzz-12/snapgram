import type { RefObject } from "react";
import { Image, Mic } from "lucide-react";
import { FaRegCircleStop } from "react-icons/fa6";

interface Props {
  messageText: string;
  selectedImageFiles: File[];
  isRecording: boolean;
  recordedFile?: File | null;
  submitting: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  startRecording: () => void;
  stopRecording: () => void;
}

const ChatInputMediaBtns = (props: Props) => {
  const { messageText, selectedImageFiles, isRecording, recordedFile, submitting, fileInputRef, startRecording, stopRecording } = props;

  if (messageText.length > 0 || selectedImageFiles.length > 0) return null;

  return (
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
  )
}

export default ChatInputMediaBtns
