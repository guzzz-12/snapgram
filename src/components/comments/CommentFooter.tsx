import type { Dispatch, SetStateAction } from "react";
import { CornerLeftDown } from "lucide-react";
import dayjs from "dayjs";
import { Button } from "../ui/button";
import type { Comment } from "@/types/global";

interface Props {
  commentData: Comment;
  openReplies: boolean;
  setOpenReplies: Dispatch<SetStateAction<boolean>>;
  setOpenChangeLogModal: Dispatch<SetStateAction<boolean>>
}

const CommentFooter = (props: Props) => {
  const { commentData, openReplies, setOpenReplies, setOpenChangeLogModal } = props;

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex justify-start items-center gap-3 py-0.5">
        <span
          className="text-xs text-neutral-600 font-medium"
          title={dayjs(commentData.createdAt).format("dddd, DD [de] MMMM [de] YYYY [a las] hh:mm a")}
        >
          {dayjs(commentData.createdAt).fromNow()}
        </span>
        
        {!commentData.parent &&
          <Button
            className="block h-fit p-0 text-xs text-neutral-600 cursor-pointer"
            variant="link"
            size="sm"
            onClick={() => setOpenReplies(true)}
          >
            Responder
          </Button>
        }

        {commentData.changeLog.length > 0 &&
          <Button
            className="block h-fit p-0 text-xs text-neutral-600 cursor-pointer"
            variant="link"
            size="sm"
            onClick={() => setOpenChangeLogModal(true)}
          >
            Editado
          </Button>
        }
      </div>

      {commentData.repliesCount > 0 && !openReplies &&
        <Button
          className="flex h-fit !px-0 !py-0 text-base text-neutral-600 cursor-pointer"
          variant="link"
          size="sm"
          onClick={() => setOpenReplies(true)}
        >
          <CornerLeftDown />
          Ver {commentData.repliesCount} {commentData.repliesCount > 1 ? "respuestas" : "respuesta"}
        </Button>
      }
    </div>
  )
}

export default CommentFooter;