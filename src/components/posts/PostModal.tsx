import { CirclePlus, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import PostCard from "./PostCard";
import PostCommentInput from "./PostCommentInput";
import CommentsList from "@/components/comments/CommentsList";
import { Dialog, DialogContent, DialogHeader, DialogOverlay } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useEditPost } from "@/services/posts";
import { useGetPostComments } from "@/services/comments";
import { errorMessage } from "@/utils/errorMessage";
import type { PostWithLikes } from "@/types/global";

interface Props {
  isOpen: boolean;
  postData: PostWithLikes;
  setIsOpen: (isOpen: boolean) => void;
}

const PostModal = ({isOpen, postData, setIsOpen}: Props) => {
  const {mutate: editPost, isPending} = useEditPost();

  const {
    comments,
    loadingComments,
    hasNextPage,
    commentsError,
    isFetchingNextPage,
    fetchNextPage
  } = useGetPostComments({postId: postData._id, enabled: isOpen});

  if (commentsError) {
    toast.error(errorMessage(commentsError));
  }
  
  const loading = loadingComments || isFetchingNextPage;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(isOpen) => setIsOpen(isOpen)}
    >
      <DialogOverlay className="bg-black/70" />

      <DialogContent className="flex flex-col gap-0 !w-full !max-w-[700px] h-[90vh] p-0 !shadow-none overflow-hidden">
        <DialogHeader className="flex justify-center p-4 bg-neutral-100 border-b overflow-hidden">
          <h2 className="max-w-[75%] mx-auto text-xl text-center font-semibold truncate">
            Publicación de {postData.user.fullName}
          </h2>
        </DialogHeader>

        <div className="h-full px-5 py-3 overflow-y-auto">
          <PostCard
            className="w-full p-0 shadow-none"
            postData={postData}
            isModal={true}
            editPost={editPost}
            isPending={isPending}
          />

          <CommentsList comments={comments} isLoading={loading} />

          {hasNextPage && !isFetchingNextPage && (
            <div className="flex justify-center items-center w-full pb-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="text-sm text-neutral-900 cursor-pointer hover:underline"
                    disabled={loading}
                    onClick={() => fetchNextPage()}
                  >
                    <CirclePlus className="size-7" />
                    <span className="sr-only">
                      {isFetchingNextPage ? "Cargando..." : "Ver más"}
                    </span>
                  </button>
                </TooltipTrigger>

                <TooltipContent>
                  Ver más comentarios
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          {isFetchingNextPage &&
            <div className="flex justify-center items-center w-full pb-4 text-neutral-600">
              <Loader2Icon className="size-7 animate-spin" />
            </div>
          }
        </div>

        <PostCommentInput postId={postData._id} />
      </DialogContent>
    </Dialog>
  )
}

export default PostModal