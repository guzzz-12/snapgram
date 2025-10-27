import type { HTMLAttributes } from "react";
import { MessageSquareText } from "lucide-react";
import CommentItem from "./CommentItem";
import type { Comment } from "@/types/global";
import { cn } from "@/lib/utils";

interface Props {
  comments: Comment[];
  isLoading: boolean;
  className?: HTMLAttributes<HTMLElement>["className"];
  isReply?: boolean;
}

const CommentsList = ({ comments, isLoading, className, isReply }: Props) => {
  if (comments.length === 0 && !isLoading && !isReply) {
    return (
      <div className="flex flex-col justify-center items-center w-full py-5">
        <MessageSquareText className="w-[150px] h-[150px] text-neutral-500 stroke-[0.75]" />
        <p className="text-neutral-500 font-semibold text-base">
          Todavía no hay comentarios
        </p>
      </div>
    )
  };

  if (comments.length > 0) {
    return (
      <ul className={cn("flex flex-col gap-4 py-3", className)}>
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

  return null;
}

export default CommentsList