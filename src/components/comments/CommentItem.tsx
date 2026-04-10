import { useState } from "react";
import { Link } from "react-router";
import { Twemoji } from "react-emoji-render";
import { CornerLeftDown, SendHorizontal } from "lucide-react";
import CommentsList from "./CommentsList";
import CommentFooter from "./CommentFooter";
import CommentDropdown from "./CommentDropdown";
import ConfirmationModal from "../ConfirmationModal";
import CommentSkeleton from "./CommentSkeleton";
import CreateCommentInput from "@/components/comments/CreateCommentInput";
import CommentEditInputBtns from "./CommentEditInputBtns";
import EditHistoryModal from "@/components/posts/EditHistoryModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useCreateComment, useDeleteComment, useGetCommentReplies, useUpdateComment } from "@/services/comments";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { Comment } from "@/types/global";

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

  const {user: currentUser} = useCurrentUser();

  // Mutation para actualizar comentario
  const {updateCommentMutation, isUpdating} = useUpdateComment();

  // Mutation para eliminar comentario
  const {deleteCommentMutation, isDeleting} = useDeleteComment();

  // Mutation para responder al comentario
  const {createCommentMutation, isCreatingComment} = useCreateComment();

  // Query para consultar las respuestas del comentario
  const {
    commentReplies,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage
  } = useGetCommentReplies(commentData._id, openReplies);

  const onUpdateCommentHandler = () => {
    updateCommentMutation({
      commentData,
      commentText,
      onSuccess: () => setIsEditing(false)
    });
  }

  const onCreateCommentHandler = () => {
    const formData = new FormData();

    formData.append("content", replyText);
    formData.append("parentId", commentData._id);

    createCommentMutation({
      postId: commentData.post._id,
      formData,
      onSuccess: () => setReplyText("")
    });
  }

  const onDeleteCommentHandler = () => {
    deleteCommentMutation({
      commentData,
      onSuccess: () => setOpenDeleteModal(false)
    });
  }

  const isPending = isUpdating || isDeleting || isCreatingComment;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between gap-3 w-full">
        <ConfirmationModal
          title="Eliminar comentario"
          isOpen={openDeleteModal}
          setIsOpen={(bool) => setOpenDeleteModal(bool)}
          isPending={isDeleting}
          cb={onDeleteCommentHandler}
        />

        <EditHistoryModal
          title="Historial de cambios"
          author={commentData.user}
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
              <div className="max-w-full min-w-0 py-2 px-3 rounded-lg bg-neutral-100 overflow-hidden">
                {/* Nombre del autor del comentario */}
                <Link
                  className="block text-sm font-semibold text-neutral-900 truncate"
                  to={`/profile/${commentData.user.clerkId}`}
                >
                  {commentData.user.fullName}
                </Link>

                {/* Contenido de texto del comentario */}
                {commentData.content && !isEditing &&
                  <p className="commentText w-fit text-sm text-neutral-700 whitespace-pre-wrap [overflow-wrap:anywhere]">
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
                      updateComment={onUpdateCommentHandler}
                    />
                  </div>
                }
              </div>
              
              {/* Dropdown de las opciones del comentario */}
              {!isEditing &&
                <CommentDropdown
                  commentData={commentData}
                  currentUser={currentUser}
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
                onClick={onCreateCommentHandler}
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