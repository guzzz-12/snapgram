import dayjs from "dayjs";
import { Dialog, DialogContent, DialogHeader, DialogOverlay, DialogTitle } from "./ui/dialog";
import { Separator } from "./ui/separator";
import type { ChangeLogType } from "@/types/global";

interface Props {
  changeLog: ChangeLogType[];
  title: string;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const ChangeLogModal = ({changeLog, title, isOpen, setIsOpen}: Props) => {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(isOpen) => {
        setIsOpen(isOpen);
      }}
    >
      <DialogOverlay className="bg-black/70" />

      <DialogContent className="overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {title}
          </DialogTitle>
        </DialogHeader>

        <Separator />

        <div className="flex flex-col gap-3 w-full max-h-[360px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
          {changeLog.map((changeLogItem) => (
            <div
              key={changeLogItem._id}
              className="flex flex-col items-start w-full p-2 border rounded-md bg-neutral-100"
            >
              <p className="text-sm whitespace-pre-wrap">
                {changeLogItem.previousContent}
              </p>

              <span
                className="text-xs text-neutral-500"
                title={dayjs(changeLogItem.editedAt).format("YYYY-MM-DD HH:mm:ss")}
              >
                {dayjs(changeLogItem.editedAt).fromNow()}
              </span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ChangeLogModal