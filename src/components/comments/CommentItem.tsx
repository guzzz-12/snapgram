import { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Twemoji } from "react-emoji-render";
import dayjs from "dayjs";
import { CornerLeftDown, SendHorizontal } from "lucide-react";
import { toast } from "sonner";
import CommentsList from "./CommentsList";
import CommentDropdown from "./CommentDropdown";
import DeleteCommentModal from "./DeleteCommentModal";
import CreateCommentInput from "@/components/posts/CreateCommentInput";
import ChangeLogModal from "@/components/ChangeLogModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import type { Comment } from "@/types/global";

type PaginatedReplies = {
  data: Comment[];
  hasMore: boolean;
  nextPage: number | null;
}

interface Props {
  commentData: Comment;
}

const CommentItem = ({ commentData }: Props) => {
  const [commentText, setCommentText] = useState(commentData.content);
  const [isEditing, setIsEditing] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openChangeLogModal, setOpenChangeLogModal] = useState(false);
  const [openReplies, setOpenReplies] = useState(false);
  const [replyText, setReplyText] = useState("");

  const {getToken} = useAuth();
  const queryClient = useQueryClient();

  const {user} = useCurrentUser();

  // Actualizar comentario
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

  // Eliminar comentario
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

  // Responder al comentario
  const {mutate: replyComment, isPending: isReplying} = useMutation({
    mutationFn: async () => {
      const token = await getToken();

      return axiosInstance({
        method: "POST",
        url: `/comments/posts/${commentData.post._id}`,
        data: {
          content: replyText,
          parentId: commentData._id
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

      await queryClient.invalidateQueries({
        queryKey: ["commentReplies", commentData._id]
      });

      setReplyText("");
    },
    onError: (error) => {
      const message = errorMessage(error);
      toast.error(message);
    }
  });

  // Consultar las respuestas del comentario
  const {data: repliesData, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} = useInfiniteQuery({
    queryKey: ["commentReplies", commentData._id],
    queryFn: async ({ pageParam }) => {
      const token = await getToken();

      const {data} = await axiosInstance<PaginatedReplies>({
        method: "GET",
        url: `/comments/replies/comment/${commentData._id}`,
        headers: {
          Authorization: `Bearer ${token}`
        },
        params: {
          page: pageParam,
          limit: 5
        }
      });

      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
    enabled: openReplies,
    refetchOnWindowFocus: false
  });

  const commentReplies = repliesData?.pages.flatMap((page) => page.data) ?? [];
  const isPending = isUpdating || isDeleting || isReplying;

  return (
    <div className="flex flex-col gap-3">
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
          title="Historial de cambios"
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

        <div className="flex flex-col w-full grow overflow-hidden">
          <div className="flex flex-col justify-start items-start gap-1">
            <div className="flex justify-start items-start gap-2 w-full">
              {/* Contenedor de información del comentario */}
              <div className="max-w-full py-2 px-3 rounded-lg bg-neutral-100 overflow-hidden">
                {/* Nombre del autor del comentario */}
                <Link
                  className="block text-sm font-semibold text-neutral-900 truncate"
                  to={`/profile/${commentData.user.clerkId}`}
                >
                  {commentData.user.fullName}
                </Link>

                {/* Contenido de texto del comentario */}
                {commentData.content && !isEditing &&
                  <p className="commentText w-fit text-sm text-neutral-700 whitespace-pre-wrap">
                    <Twemoji className="[&>img]:!inline" text={commentData.content} />
                  </p>
                }

                {/* Input de edición del comentario */}
                {isEditing &&
                  <div className="flex flex-col gap-2 grow w-full mt-2">
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
              </div>
              
              {/* Dropdown de las opciones del comentario */}
              {user?.clerkId === commentData.user.clerkId && !isEditing &&
                <CommentDropdown
                  commentData={commentData}
                  isPending={isPending}
                  setIsEditing={setIsEditing}
                  setOpenDeleteModal={setOpenDeleteModal}
                  setOpenChangeLogModal={setOpenChangeLogModal}
                />
              }
            </div>

            {/* Contenido de imagen del comentario */}
            {commentData.commentType === "image" &&
              <div className="w-full h-auto max-h-[210px] pt-2">
                <img
                  className="w-auto h-full object-contain object-center rounded-md shadow"
                  src={commentData.mediaUrl}
                  alt=""
                />
              </div>
            }

            {/* Footer del comentario */}
            <div className="flex flex-col items-start gap-1">
              <div className="flex justify-start items-center gap-3 py-0.5">
                <span
                  className="text-xs text-neutral-600 font-medium"
                  title={dayjs(commentData.createdAt).format("dddd, DD [de] MMMM [de] YYYY [a las] hh:mm a")}
                >
                  {dayjs(commentData.createdAt).fromNow()}
                </span>

                <Button
                  className="block h-fit p-0 text-xs text-neutral-600 cursor-pointer"
                  variant="link"
                  size="sm"
                  onClick={() => setOpenReplies(true)}
                >
                  Responder
                </Button>

                {commentData.changeLog.length > 0 &&
                  <Button
                    className="block h-fit p-0 text-xs text-neutral-600 cursor-pointer"
                    variant="link"
                    size="sm"
                    onClick={() => setOpenChangeLogModal(true)}
                  >
                    Editado
                  </Button>
                }
              </div>

              {commentData.repliesCount > 0 && !openReplies &&
                <Button
                  className="flex h-fit !px-0 !py-0 text-base text-neutral-600 cursor-pointer"
                  variant="link"
                  size="sm"
                  onClick={() => setOpenReplies(true)}
                >
                  <CornerLeftDown />
                  Ver {commentData.repliesCount} {commentData.repliesCount > 1 ? "respuestas" : "respuesta"}
                </Button>
              }
            </div>
          </div>
        </div>
      </div>

      {/* Lista de respuestas e input para responder al comentario */}
      {openReplies &&
        <div className="flex flex-col w-full grow pl-20 ml-auto">
          <CommentsList comments={commentReplies} />

          <div className="flex justify-start items-center gap-2 p-2 bg-neutral-100 rounded-md">
            <CreateCommentInput
              textContent={replyText}
              isPending={isPending}
              className="py-3 placeholder:!italic"
              placeholder={`Respondiendo a ${commentData.user.fullName}...`}
              setTextContent={setReplyText}
            />
            <Button
              className="h-full shrink-0 bg-[#4F39F6] hover:bg-[#331fcf] cursor-pointer disabled:pointer-events-none"
              disabled={isPending || !replyText}
              onClick={() => replyComment()}
            >
              <SendHorizontal className="size-5" aria-hidden />
              <span className="sr-only">
                Responder a {commentData.user.fullName}
              </span>
            </Button>
          </div>
        // </div>
      }
    </div>
  )
}

export default CommentItem