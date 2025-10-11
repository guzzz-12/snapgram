import PostCard from "./PostCard";
import PostCommentInput from "./PostCommentInput";
import { Dialog, DialogContent, DialogHeader, DialogOverlay } from "../ui/dialog";
import { Separator } from "../ui/separator";
import type { PostWithLikes } from "@/types/global";

interface Props {
  isOpen: boolean;
  postData: PostWithLikes;
  setIsOpen: (isOpen: boolean) => void;
}

const PostModal = ({isOpen, postData, setIsOpen}: Props) => {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(isOpen) => setIsOpen(isOpen)}
    >
      <DialogOverlay className="bg-black/70" />

      <DialogContent className="gap-0 !w-full !max-w-[700px] h-[90vh] p-0 !shadow-none overflow-hidden">
        <DialogHeader className="flex justify-center p-4 border-b overflow-hidden">
          <h2 className="max-w-[75%] mx-auto text-xl text-center font-semibold truncate">
            Publicación de {postData.user.fullName}
          </h2>
        </DialogHeader>

        <div className="p-5 pb-0 overflow-y-auto">
          <PostCard
            className="w-full p-0 shadow-none"
            postData={postData}
          />

          <Separator className="mt-3" />
        </div>

        <PostCommentInput postId={postData._id} />
      </DialogContent>
    </Dialog>
  )
}

export default PostModal