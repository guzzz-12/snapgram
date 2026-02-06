import { Link } from "react-router";
import dayjs from "dayjs";
import { Dialog, DialogContent, DialogHeader, DialogOverlay, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { firstLetterUpperCase } from "@/utils/firstLetterUpperCase";
import type { ChangeLogType } from "@/types/global";

interface Props {
  author: {
    _id: string;
    clerkId: string;
    fullName: string;
    profilePicture: string;
  };
  changeLog: ChangeLogType[];
  title: string;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

/** Modal del historial de edición de los posts y de los comentarios */
const EditHistoryModal = ({author, changeLog, title, isOpen, setIsOpen}: Props) => {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(isOpen) => {
        setIsOpen(isOpen);
      }}
    >
      <DialogOverlay className="bg-black/70" />

      <DialogContent className="gap-0 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {title}
          </DialogTitle>
        </DialogHeader>

        <Separator className="h-[0.5px] mt-1 mb-6 bg-neutral-400" />

        <div className="flex flex-col gap-6 w-full max-h-[360px] overflow-x-hidden overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
          {changeLog.map((changeLogItem) => (
            <div
              key={changeLogItem._id}
              className="flex flex-col items-start w-full"
            >
              <span
                className="block mb-2 text-base text-neutral-700 font-medium"
                title={dayjs(changeLogItem.editedAt).format("YYYY-MM-DD HH:mm:ss")}
              >
                {firstLetterUpperCase(dayjs(changeLogItem.editedAt).fromNow())}
              </span>

              <div className="w-full p-2 border rounded-md bg-neutral-100 overflow-hidden">
                <Link
                  className="flex justify-start items-center gap-2.5 max-w-fit mb-2 overflow-hidden"
                  to={`/profile/${author.clerkId}`}
                >
                  <Avatar className="w-9 h-9 shrink-0 rounded-full">
                    <AvatarImage
                      className="w-full h-full object-cover object-center"
                      src={author.profilePicture}
                    />
                    <AvatarFallback className="w-full h-full object-cover object-center">
                      {author.fullName.charAt(0).toUpperCase()}
                      {author.fullName.charAt(1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <p className="w-full text-neutral-700 font-semibold truncate">
                    {author.fullName}
                  </p>
                </Link>

                <p className="text-base text-neutral-900 whitespace-pre-wrap leading-tight">
                  {changeLogItem.previousContent}
                </p>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default EditHistoryModal