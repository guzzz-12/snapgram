import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogOverlay, DialogTitle } from "@/components/ui/dialog";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import dayjs from "@/utils/dayJsInstance";
import { decryptMsgHistory } from "@/utils/decryptMsgHistory";
import type { MessageType } from "@/types/global";

interface Props {
  messageData: MessageType;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void
}

const MessageHistoryModal = (props: Props) => {
  const { messageData, isOpen, setIsOpen } = props;

  const [message, setMessage] = useState<MessageType>(messageData);

  const {user: currentUser} = useCurrentUser();

  // Desencriptar el historial de cambios del mensaje
  useEffect(() => {
    if (!currentUser) return;

    decryptMsgHistory(messageData, currentUser._id)
    .then((data) => {
      setMessage(data);
    })
    .catch((_error) =>{
      console.log("Error desencriptando el historial de cambios del mensaje");
    });
  }, [messageData, currentUser]);

  if (!message.history) {
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
          {message.history.map(data => (
            <li
              key={data._id}
              className="flex flex-col w-full p-2 border rounded-md bg-slate-100"
            >
              <p className="text-sm whitespace-pre-wrap">
                {data.previousContent}
              </p>

              <span className="text-[10px] text-right text-neutral-600">
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