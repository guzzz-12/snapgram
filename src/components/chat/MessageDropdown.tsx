import type { ReactNode } from "react";
import { Pencil, Trash2Icon } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import type { MessageType } from "@/types/global";

interface Props {
  messageData: MessageType;
  currentUserId: string;
  isPending: boolean;
  children: ReactNode;
  onEdit: (isEditing: boolean) => void;
  onDelete: (deleteFor: "me" | "all") => void;
}

const MessageDropdown = (props: Props) => {
  const { messageData, currentUserId, isPending, children, onEdit, onDelete } = props;

  const isCurrentUserSender = messageData.sender._id === currentUserId;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        {isCurrentUserSender &&
          <>
            {messageData.type !== "audio" &&
              <DropdownMenuItem
                className="flex justify-start items-center gap-2 cursor-pointer"
                onClick={() => onEdit(true)}
              >
                <Pencil className="size-5 text-neutral-500" />
                <span className="text-sm text-neutral-900">Editar</span>
              </DropdownMenuItem>
            }
            
            <DropdownMenuItem
              className="flex justify-start items-center gap-2 cursor-pointer"
              disabled={isPending}
              onClick={() => onDelete("me")}
            >
              <Trash2Icon className="size-5 text-neutral-500" />
              <span className="text-sm text-neutral-900">Eliminar para mí</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className="flex justify-start items-center gap-2 cursor-pointer"
              disabled={isPending}
              onClick={() => onDelete("all")}
            >
              <Trash2Icon className="size-5 text-destructive opacity-50" />
              <span className="text-sm text-destructive">Eliminar para todos</span>
            </DropdownMenuItem>

          </>
        }

        {!isCurrentUserSender &&
          <DropdownMenuItem
            className="flex justify-start items-center gap-2 cursor-pointer"
            disabled={isPending}
            onClick={() => onDelete("me")}
          >
            <Trash2Icon className="size-5 text-neutral-500" />
            <span className="text-sm text-neutral-900">Eliminar para mí</span>
          </DropdownMenuItem>
        }
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default MessageDropdown