import { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Twemoji } from "react-emoji-render";
import dayjs from "dayjs";
import { Ellipsis, Pencil, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import DeleteCommentModal from "./DeleteCommentModal";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Separator } from "../ui/separator";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import { cn } from "@/lib/utils";
import type { Comment } from "@/types/global";

interface Props {
  commentData: Comment;
}

const CommentItem = ({ commentData }: Props) => {
  const [openDeleteModal, setOpenDeleteModal] = useState(false);

  const {getToken} = useAuth();
  const queryClient = useQueryClient();

  const {user} = useCurrentUser();

  const {mutate, isPending} = useMutation({
    mutationFn: async () => {
      const token = await getToken();

      return axiosInstance({
        method: "DELETE",
        url: `/comments/${commentData._id}`,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["postComments", commentData.post._id]
      });

      setOpenDeleteModal(false);
    },
    onError: (error) => {
      const message = errorMessage(error);
      toast.error(message);
    }
  });

  return (
    <div className="flex justify-between gap-3 w-full">
      <DeleteCommentModal
        isOpen={openDeleteModal}
        commentId={commentData._id}
        postId={commentData.post._id}
        isPending={isPending}
        setIsOpen={setOpenDeleteModal}
        onDeleteHandler={() => mutate()}
      />

      <Link
        className="flex flex-col justify-start h-full shrink-0"
        to={`/profile/${commentData.user.clerkId}`}
      >
        <Avatar className="w-[32px] h-[32px] shrink-0">
          <AvatarImage src={commentData.user.profilePicture} />
          <AvatarFallback className="w-full h-full">
            {commentData.user.fullName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Link>

      <div className="flex flex-col w-full grow py-2 px-3 rounded-lg bg-neutral-100 overflow-hidden">
        <div className="flex justify-start items-center gap-3 w-full overflow-hidden">
          <div className="flex flex-col justify-start items-start gap-0 mb-2">
            <Link
              className="text-sm font-semibold text-neutral-900 truncate"
              to={`/profile/${commentData.user.clerkId}`}
            >
              {commentData.user.fullName}
            </Link>

            <span
              className="text-xs text-neutral-700"
              title={dayjs(commentData.createdAt).format("dddd, DD [de] MMMM [de] YYYY [a las] hh:mm a")}
            >
              {dayjs(commentData.createdAt).fromNow()}
            </span>
          </div>

          {user?.clerkId === commentData.user.clerkId &&
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn("flex justify-center items-center min-w-6 min-h-6 ml-auto p-2 shrink-0 rounded-full bg-transparent hover:bg-neutral-200 cursor-pointer transition-colors", isPending && "pointer-events-none")}
                  disabled={isPending}
                >
                  <Ellipsis className="size-4 text-neutral-700" aria-hidden />
                  <span className="sr-only">
                    Opciones del comentario
                  </span>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent>
                <DropdownMenuItem
                  className={cn("flex justify-start items-center gap-2 cursor-pointer", isPending && "pointer-events-none")}
                  disabled={isPending}
                  onClick={() => {}}
                >
                  <Pencil className="size-4.5" aria-hidden />
                  <span className="text-sm text-neutral-900">Editar</span>
                </DropdownMenuItem>

                <Separator />
                
                <DropdownMenuItem
                  className={cn("flex justify-start items-center gap-2 cursor-pointer hover:!bg-destructive/5", isPending && "pointer-events-none")}
                  disabled={isPending}
                  onClick={() => setOpenDeleteModal(true)}
                >
                  <Trash2Icon className="size-5 text-destructive/60" aria-hidden />
                  <span className="text-sm text-destructive">Eliminar</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        </div>

        {commentData.content &&
          <p className="commentText text-sm text-neutral-700 whitespace-pre-wrap">
            <Twemoji text={commentData.content} />
          </p>
        }

        {commentData.commentType === "image" &&
          <div className="w-full h-auto max-h-[210px] pt-2">
            <img
              className="w-auto h-full object-contain object-center rounded-md shadow"
              src={commentData.mediaUrl}
              alt=""
            />
          </div>
        }
      </div>
    </div>
  )
}

export default CommentItem