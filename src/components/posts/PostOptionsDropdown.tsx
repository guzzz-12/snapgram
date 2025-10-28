import { Ellipsis, Logs, Pencil, Trash2Icon } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Separator } from "../ui/separator";
import { cn } from "@/lib/utils";
import type { PostWithLikes } from "@/types/global";

interface Props {
  postData: PostWithLikes;
  userId: string | null | undefined;
  isPending: boolean;
  setisEditingPost: (value: boolean) => void;
  setOpenDeleteModal: (isOpen: boolean) => void;
  setOpenChangelogModal: (isOpen: boolean) => void;
}

const PostOptionsDropdown = (props: Props) => {
  const { postData, userId, isPending, setisEditingPost, setOpenDeleteModal, setOpenChangelogModal } = props

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn("flex justify-center items-center w-9 h-9 p-2 shrink-0 rounded-full bg-transparent hover:bg-neutral-200 cursor-pointer transition-colors", isPending && "pointer-events-none")}
          disabled={isPending}
        >
          <Ellipsis className="size-5 text-neutral-700" aria-hidden />
          <span className="sr-only">
            Opciones del post
          </span>
        </button>
      </DropdownMenuTrigger>

        <DropdownMenuContent>
          {userId === postData.user.clerkId &&  
            <>
              <DropdownMenuItem
                className={cn("flex justify-start items-center gap-2 cursor-pointer", isPending && "pointer-events-none")}
                disabled={isPending}
                onClick={() => setisEditingPost(true)}
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
            </>
          }

          <DropdownMenuItem
            className={cn("flex justify-start items-center gap-2 cursor-pointer", isPending && "pointer-events-none")}
            disabled={isPending || !postData.changeLog.length}
            onClick={() => setOpenChangelogModal(true)}
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

export default PostOptionsDropdown