import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";
import PostModal from "./PostModal";
import LikesPopover from "@/components/likes/LikesPopover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { errorMessage } from "@/utils/errorMessage";
import { axiosInstance } from "@/utils/axiosInstance";
import type { PostWithLikes } from "@/types/global";
import { cn } from "@/lib/utils";

interface Props {
  postData: PostWithLikes;
  isModal?: boolean;
}

const PostCardFooter = ({ postData, isModal }: Props) => {
  const [openPostModal, setOpenPostModal] = useState(false);

  const {getToken} = useAuth();

  const queryClient = useQueryClient();

  const likeMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();

      return axiosInstance({
        method: "POST",
        url: `/likes/post/${postData._id}`,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ["posts"]});
      await queryClient.invalidateQueries({queryKey: ["posts", postData._id]});
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    }
  });

  return (
    <div className="flex flex-col gap-3">
      <PostModal
        isOpen={openPostModal}
        postData={postData}
        setIsOpen={setOpenPostModal}
      />

      <div className="flex justify-start items-center gap-5 w-full">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="flex items-center gap-2 text-neutral-500 cursor-pointer"
              disabled={likeMutation.isPending}
              onClick={() => likeMutation.mutate()}
            >
              <Heart
                className="size-6"
                fill={postData.isLiked ? "red" : "none"}
                stroke={postData.isLiked ? "red" : "currentColor"}
                aria-hidden
              />
              <span className="sr-only">
                Este post tiene {postData.likesCount} me gusta
              </span>
            </button>
          </TooltipTrigger>

          <TooltipContent>
            {postData.isLiked ? "Ya no me gusta" : "Me gusta"}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={cn("flex items-center gap-2 text-neutral-500", isModal ? "cursor-default pointer-events-none" : "cursor-pointer")}
              onClick={() => {
                if (!isModal) {
                  setOpenPostModal(true);
                }
              }}
            >
              <MessageCircle className="size-6" aria-hidden />
              <span className="sr-only">
                Este post tiene {21} Comentarios
              </span>
            </button>
          </TooltipTrigger>

          <TooltipContent>
            Comentar
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button className="flex items-center gap-2 text-neutral-500 cursor-pointer">
              <Share2 className="size-6" aria-hidden />
              <span className="sr-only">
                Este post ha sido compartido {6} veces
              </span>
            </button>
          </TooltipTrigger>

          <TooltipContent>
            Compartir
          </TooltipContent>
        </Tooltip>
      </div>
      
      <div className="flex justify-start items-center gap-6 pt-3 font-semibold text-neutral-700 text-sm border-t">
        <LikesPopover
          itemId={postData._id}
          likesCount={postData.likesCount}
          itemType="post"
        />

        <button
          className={cn(isModal ? "cursor-default pointer-events-none" : "cursor-pointer")}
          onClick={() => {
            if (!isModal) {
              setOpenPostModal(true);
            }
          }}
        >
          {postData.commentsCount} Comentarios
        </button>

        <span>
          {0} Compartido
        </span>
      </div>
    </div>
  )
}

export default PostCardFooter