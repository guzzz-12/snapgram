import { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Twemoji } from "react-emoji-render";
import { CornerLeftDown, SendHorizontal } from "lucide-react";
import { toast } from "sonner";
import CommentsList from "./CommentsList";
import CommentFooter from "./CommentFooter";
import CommentDropdown from "./CommentDropdown";
import DeleteConfirmModal from "../DeleteConfirmModal";
import CommentSkeleton from "./CommentSkeleton";
import CreateCommentInput from "@/components/posts/CreateCommentInput";
import CommentEditInputBtns from "./CommentEditInputBtns";
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

      await queryClient.invalidateQueries({
        queryKey: ["commentReplies", commentData._id]
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
    refetchOnWindowFocus: false,
    staleTime: 0
  });

  const commentReplies = repliesData?.pages.flatMap((page) => page.data) ?? [];
  const isPending = isUpdating || isDeleting || isReplying;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between gap-3 w-full">
        <DeleteConfirmModal
          title="Eliminar comentario"
          isOpen={openDeleteModal}
          setIsOpen={(bool) => setOpenDeleteModal(bool)}
          isPending={isDeleting}
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
            <AvatarImage
              className="w-full h-full object-cover"
              src={commentData.user.profilePicture}
            />
            <AvatarFallback className="w-full h-full object-cover">
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

                    <CommentEditInputBtns
                      commentData={commentData}
                      isPending={isPending}
                      commentText={commentText}
                      setIsEditing={setIsEditing}
                      updateComment={() => updateComment()}
                    />
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
            
            <CommentFooter
              commentData={commentData}
              openReplies={openReplies}
              setOpenReplies={setOpenReplies}
              setOpenChangeLogModal={setOpenChangeLogModal}
            />
          </div>
        </div>
      </div>

      {/* Lista de respuestas del comentario, input para responder al comentario */}
      {openReplies && !commentData.parent &&
        <div className="flex flex-col gap-3 w-full grow pl-14 ml-auto">
          {isLoading &&
            <div className="flex flex-col gap-3 w-full">
              <CommentSkeleton commentWidth="w-[90%]" commentHeight="h-[80px]" />
              <CommentSkeleton commentWidth="w-[55%]" commentHeight="h-[50px]" />
              <CommentSkeleton commentWidth="w-[70%]" commentHeight="h-[60px]" />
            </div>
          }

          <CommentsList
            comments={commentReplies}
            isLoading={isLoading}
            className="pb-0"
            isReply
          />

          {isFetchingNextPage &&
            <div className="flex flex-col gap-3 w-full">
              <CommentSkeleton commentWidth="w-[90%]" commentHeight="h-[80px]" />
              <CommentSkeleton commentWidth="w-[55%]" commentHeight="h-[50px]" />
              <CommentSkeleton commentWidth="w-[70%]" commentHeight="h-[60px]" />
            </div>
          }

          {/* Referencia del paginador */}
          {hasNextPage && !isFetchingNextPage && !isLoading &&
            <Button
              className="flex h-fit mr-auto !px-0 !py-0 text-base text-neutral-600 cursor-pointer"
              variant="link"
              size="sm"
              onClick={() => fetchNextPage()}
            >
              <CornerLeftDown />
              Ver más respuestas
            </Button>
          }

          <div className="relative flex justify-start items-center gap-2 p-2 bg-neutral-100 rounded-md">
            <CreateCommentInput
              textContent={replyText}
              isPending={isPending}
              className="py-3 placeholder:!italic"
              placeholder="Escribe una respuesta..."
              setTextContent={setReplyText}
            />

            {replyText.length > 0 &&
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
            }

            <Button
              className="absolute right-0 bottom-0 text-xs text-neutral-700 translate-y-[100%] cursor-pointer z-10"
              variant="link"
              size="sm"
              onClick={() => setOpenReplies(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      }
    </div>
  )
}

export default CommentItem