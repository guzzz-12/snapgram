import type { ReactNode } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import type { MessageType } from "@/dummy-data";
import { Pencil, Trash2Icon } from "lucide-react";

interface Props {
  messageData: MessageType;
  currentUserId: string;
  children: ReactNode;
}

const MessageDropdown = ({ messageData, currentUserId, children }: Props) => {
  const isCurrentUserSender = messageData.from_user_id === currentUserId;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        {isCurrentUserSender &&
          <>
            <DropdownMenuItem className="flex justify-start items-center gap-2 cursor-pointer">
              <Pencil className="size-5 text-neutral-500" />
              <span className="text-sm text-neutral-900">Editar</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem className="flex justify-start items-center gap-2 cursor-pointer">
              <Trash2Icon className="size-5 text-neutral-500" />
              <span className="text-sm text-neutral-900">Eliminar para mí</span>
            </DropdownMenuItem>

            <DropdownMenuItem className="flex justify-start items-center gap-2 cursor-pointer">
              <Trash2Icon className="size-5 text-destructive opacity-50" />
              <span className="text-sm text-destructive">Eliminar para todos</span>
            </DropdownMenuItem>

          </>
        }

        {!isCurrentUserSender &&
          <DropdownMenuItem className="flex justify-start items-center gap-2 cursor-pointer">
            <Trash2Icon className="size-5 text-neutral-500" />
            <span className="text-sm text-neutral-900">Eliminar para mí</span>
          </DropdownMenuItem>
        }
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default MessageDropdown