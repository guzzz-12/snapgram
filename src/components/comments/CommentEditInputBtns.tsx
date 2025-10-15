import type { Dispatch, SetStateAction } from "react";
import { Button } from "../ui/button";
import type { Comment } from "@/types/global";

interface Props {
  isPending: boolean;
  commentData: Comment;
  commentText: string;
  updateComment: () => void;
  setIsEditing: Dispatch<SetStateAction<boolean>>;
}

const CommentEditInputBtns = (props: Props) => {
  const { isPending, commentData, commentText, updateComment, setIsEditing } = props;

  return (
    <div className="flex justify-end items-center gap-2 w-full">
      <Button
        className="cursor-pointer"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => setIsEditing(false)}
      >
        Cancelar
      </Button>

      <Button
        className="bg-[#4F39F6] hover:bg-[#331fcf] cursor-pointer disabled:pointer-events-none"
        size="sm"
        disabled={
          isPending
          ||
          commentData.content === commentText
          ||
          commentData.content === ""
        }
        onClick={() => updateComment()}
      >
        Guardar cambios
      </Button>
    </div>
  )
}

export default CommentEditInputBtns