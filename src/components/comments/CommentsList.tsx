import { MessageSquareText } from "lucide-react";
import CommentItem from "./CommentItem";
import type { Comment } from "@/types/global";

interface Props {
  comments: Comment[];
}

const CommentsList = ({ comments }: Props) => {
  if (comments.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center w-full py-5">
        <MessageSquareText className="w-[150px] h-[150px] text-neutral-500 stroke-[0.75]" />
        <p className="text-neutral-500 font-semibold">
          Todavía no hay comentarios
        </p>
      </div>
    )
  };

  return (
    <ul className="flex flex-col gap-3 pt-3 pb-6 border-t">
      {comments.map(comment => {
        return (
          <CommentItem
            key={comment._id}
            commentData={comment}
          />
        )
      })}
    </ul>
  )
}

export default CommentsList