import { Ellipsis, Logs, Pencil, Trash2Icon } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Separator } from "../ui/separator";
import { cn } from "@/lib/utils";
import type { Comment } from "@/types/global";

interface Props {
  commentData: Comment;
  isPending: boolean;
  setIsEditing: (isEditing: boolean) => void;
  setOpenDeleteModal: (isOpen: boolean) => void;
  setOpenChangeLogModal: (isOpen: boolean) => void;
}

const CommentDropdown = (props: Props) => {
  const { commentData, isPending, setIsEditing, setOpenDeleteModal, setOpenChangeLogModal } = props;

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
  )
}

export default CommentDropdown