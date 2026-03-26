import { Ellipsis, Logs, Pencil, Trash2Icon } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Separator } from "../ui/separator";
import type { Comment, UserType } from "@/types/global";
import { cn } from "@/lib/utils";

interface Props {
  commentData: Comment;
  currentUser: UserType | null;
  isPending: boolean;
  setIsEditing: (isEditing: boolean) => void;
  setOpenDeleteModal: (isOpen: boolean) => void;
  setOpenChangeLogModal: (isOpen: boolean) => void;
}

const CommentDropdown = (props: Props) => {
  const {
    commentData,
    isPending,
    currentUser,
    setIsEditing,
    setOpenDeleteModal,
    setOpenChangeLogModal
  } = props;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn("flex justify-center items-center min-w-6 min-h-6 p-2 shrink-0 rounded-full bg-transparent hover:bg-neutral-200 cursor-pointer transition-colors", isPending && "pointer-events-none")}
          disabled={isPending}
        >
          <Ellipsis className="size-4 text-neutral-700" aria-hidden />
          <span className="sr-only">
            Opciones del comentario
          </span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        {currentUser?.clerkId === commentData.user.clerkId &&
          <>
            <DropdownMenuItem
              className={cn("flex justify-start items-center gap-2 cursor-pointer", isPending && "pointer-events-none")}
              disabled={isPending}
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="size-4.5" aria-hidden />
              <span className="text-sm text-neutral-900">Editar</span>
            </DropdownMenuItem>

            <Separator />
          </>
        }

        {/* Mostrar opción de eliminar si el comentario es del usuario o si el comentario es de un post que le pertenece */}
        {((currentUser?.clerkId === commentData.user.clerkId) || (currentUser?._id === commentData.post.userId)) &&
          <>
            <DropdownMenuItem
              className={cn("flex justify-start items-center gap-2 cursor-pointer hover:!bg-destructive/5", isPending && "pointer-events-none")}
              disabled={isPending}
              onClick={() => setOpenDeleteModal(true)}
            >
              <Trash2Icon className="size-5 text-destructive/60" aria-hidden />
              <span className="text-sm text-destructive">Eliminar</span>
            </DropdownMenuItem>

            <Separator />
          </>
        }

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
  )
}

export default CommentDropdown