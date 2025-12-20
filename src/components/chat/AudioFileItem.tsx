import { IoIosRecording } from "react-icons/io";
import { Trash2Icon } from "lucide-react";
import { Button } from "../ui/button";

interface Props {
  recordingDuration: string;
  isSending: boolean;
  clearRecording: () => void;
}

const AudioFileItem = ({ recordingDuration, isSending, clearRecording }: Props) => {
  return (
    <div className="flex justify-center items-center gap-2 w-full h-full py-1 bg-white">
      <IoIosRecording className="size-8 shrink-0 text-[#4F39F6]" />

      <div className="flex flex-col justify-center items-start shrink-0">
        <span className="shrink-0 text-sm text-[#4F39F6] font-semibold">
          Audio grabado
        </span>

        <span className="shrink-0 text-xs text-[#4F39F6]">
          {recordingDuration}
        </span>
      </div>

      <Button
        className="h-full ml-2 rounded-full cursor-pointer disabled:pointer-events-none"
        variant="ghost"
        size="icon"
        type="button"
        disabled={isSending}
        onClick={clearRecording}
      >
        <Trash2Icon className="size-5 text-red-700" />
      </Button>
    </div>
  )
}

export default AudioFileItem