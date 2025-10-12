import type { Comment } from "@/types/global";
import CommentItem from "./CommentItem";

interface Props {
  comments: Comment[];
}

const CommentsList = ({ comments }: Props) => {
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