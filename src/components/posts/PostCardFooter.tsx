import type { HTMLAttributes } from "react";
import { useSearchParams } from "react-router";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import PostModal from "./PostModal";
import PostCardFooterBtn from "./PostCardFooterBtn";
import LikesPopover from "@/components/likes/LikesPopover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTogglePostLike } from "@/services/likes";
import { useCreatePublicationModal } from "@/hooks/useCreatePublicationModal";
import type { PostWithLikes } from "@/types/global";
import { cn } from "@/lib/utils";

interface Props {
  postData: PostWithLikes;
  openPostModal?: boolean;
  isModal?: boolean;
  className?: HTMLAttributes<HTMLElement>["className"];
  setOpenPostModal?: (isOpen: boolean) => void;
}

const PostCardFooter = ({ postData, isModal, openPostModal, className, setOpenPostModal }: Props) => {
  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get("searchTerm");

  const {setOpen} = useCreatePublicationModal();

  // Dar/quitar like al post
  const {togglePostLikeMutation, isPending} = useTogglePostLike({
    postId: postData._id,
    searchTerm: searchTerm || ""
  });

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <PostModal
        isOpen={!!openPostModal}
        postData={postData}
        setIsOpen={setOpenPostModal ? setOpenPostModal : () => {}}
      />

      <div className="flex justify-start items-center gap-5 w-full">
        <LikesPopover
          itemId={postData._id}
          postData={postData}
          itemType="post"
        />

        <div className="flex items-center gap-4 ml-auto">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-neutral-700 font-semibold">
                  {postData.commentsCount}
                </span>

                <MessageCircle className="size-5 text-neutral-500" aria-hidden />

                <span className="sr-only">
                  Este post tiene {postData.commentsCount} Comentarios
                </span>
              </div>
            </TooltipTrigger>

            <TooltipContent>
              {postData.commentsCount} Comentarios
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-neutral-700 font-semibold">
                  {postData.sharedCount}
                </span>

                <Share2 className="size-5 text-neutral-500" aria-hidden />

                <span className="sr-only">
                  {postData.sharedCount > 0 ? `Este post ha sido compartido ${postData.sharedCount} veces` : "Este post aún no ha sido compartido"}
                </span>
              </div>
            </TooltipTrigger>

            <TooltipContent>
              {postData.sharedCount} Compartidos
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
      
      <div className="flex justify-between items-center gap-1 w-full pt-2 text-neutral-700 text-sm font-semibold border-t overflow-hidden">
        <PostCardFooterBtn
          disabled={isPending}
          callback={() => togglePostLikeMutation()}
        >
          <Heart
            className="size-4.5 shrink-0"
            fill={postData.isLiked ? "red" : "none"}
            stroke={postData.isLiked ? "red" : "currentColor"}
            aria-hidden
          />

          <span className="hidden min-[550px]:block min-[999px]:hidden min-[1150px]:inline">
            Me gusta
          </span>
        </PostCardFooterBtn>

        <PostCardFooterBtn
          disabled={false}
          callback={() => {
            if (!isModal) {
              setOpenPostModal?.(true);
            }
          }}
        >
          <MessageCircle className="size-4.5 shrink-0" aria-hidden />
          <span className="hidden min-[550px]:block min-[999px]:hidden min-[1150px]:inline">
            Comentar
          </span>
        </PostCardFooterBtn>

        <PostCardFooterBtn
          disabled={false}
          callback={() => setOpen({
            open: true,
            publicationType: "post",
            isRepost: true,
            repostedPostId: postData._id
          })}
        >
          <Share2 className="size-4.5 shrink-0" aria-hidden />
          <span className="hidden min-[550px]:block min-[999px]:hidden min-[1150px]:inline">
            Compartir
          </span>
        </PostCardFooterBtn>
      </div>
    </div>
  )
}

export default PostCardFooter