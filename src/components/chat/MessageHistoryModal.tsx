import { Dialog, DialogContent, DialogHeader, DialogOverlay, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import dayjs from "@/utils/dayJsInstance";
import type { MessageType } from "@/types/global";

interface Props {
  messageData: MessageType;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void
}

const MessageHistoryModal = (props: Props) => {
  const { messageData, isOpen, setIsOpen } = props;

  if (!messageData.history) {
    return null;
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(isOpen) => setIsOpen(isOpen)}
    >
      <DialogOverlay className="bg-black/65" />

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Historial de cambios</DialogTitle>
        </DialogHeader>

        <ul className="flex flex-col gap-3 w-full max-h-[360px] overflow-y-auto bg-white scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
          {messageData.history.map(data => (
            <li
              key={data._id}
              className="flex flex-col w-full p-2 border rounded-md bg-slate-100"
            >
              <p className="text-sm whitespace-pre-wrap">
                {data.previousContent}
              </p>
              <Separator className="w-full my-1 bg-neutral-200" />
              <span className="text-xs text-right text-neutral-600">
                {dayjs(data.editedAt).format("DD/MM/YYYY - hh:mm a")}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}

export default MessageHistoryModal