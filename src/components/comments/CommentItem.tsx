import { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Twemoji } from "react-emoji-render";
import dayjs from "dayjs";
import { Ellipsis, Logs, Pencil, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import DeleteCommentModal from "./DeleteCommentModal";
import CreateCommentInput from "@/components/posts/CreateCommentInput";
import ChangeLogModal from "@/components/ChangeLogModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import { cn } from "@/lib/utils";
import type { Comment } from "@/types/global";

interface Props {
  commentData: Comment;
}

const CommentItem = ({ commentData }: Props) => {
  const [commentText, setCommentText] = useState(commentData.content);
  const [isEditing, setIsEditing] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openChangeLogModal, setOpenChangeLogModal] = useState(false);

  const {getToken} = useAuth();
  const queryClient = useQueryClient();

  const {user} = useCurrentUser();

  const {mutate: updateComment, isPending: isUpdating} = useMutation({
    mutationFn: async () => {
      const token = await getToken();

      return axiosInstance({
        method: "PUT",
        url: `/comments/${commentData._id}`,
        data: {
          content: commentText
        },
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["postComments", commentData.post._id]
      });

      setIsEditing(false);
    },
    onError: (error) => {
      const message = errorMessage(error);
      toast.error(message);
    }
  });

  const {mutate: deleteComment, isPending: isDeleting} = useMutation({
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

  const isPending = isUpdating || isDeleting;

  return (
    <div className="flex justify-between gap-3 w-full">
      <DeleteCommentModal
        isOpen={openDeleteModal}
        commentId={commentData._id}
        postId={commentData.post._id}
        isPending={isDeleting}
        setIsOpen={setOpenDeleteModal}
        onDeleteHandler={() => deleteComment()}
      />

      <ChangeLogModal
        title="Ver historial de cambios"
        changeLog={commentData.changeLog}
        isOpen={openChangeLogModal}
        setIsOpen={setOpenChangeLogModal}
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
                  onClick={() => setIsEditing(true)}
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

                <Separator />

                <DropdownMenuItem
                  className="flex justify-start items-center gap-2 cursor-pointer disabled:pointer-events-none"
                  disabled={isPending || !commentData.changeLog.length}
                  onClick={() => setOpenChangeLogModal(true)}
                >
                  <Logs className="size-5" aria-hidden />
                  <span className="text-sm text-neutral-900">
                    Ver historial de cambios
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        </div>

        {isEditing &&
          <div className="flex flex-col gap-2 w-full">
            <CreateCommentInput
              isPending={isUpdating}
              textContent={commentText}
              setTextContent={setCommentText}
            />

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
          </div>
        }

        {commentData.content && !isEditing &&
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