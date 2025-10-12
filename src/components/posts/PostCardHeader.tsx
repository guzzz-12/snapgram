import { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import dayjs from "dayjs";
import { Ellipsis, Pencil, Trash2Icon } from "lucide-react";
import DeletePostModal from "./DeletePostModal";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Separator } from "../ui/separator";
import type { PostType } from "@/types/global";
import { cn } from "@/lib/utils";

interface Props {
  postData: PostType;
};

const PostCardHeader = ({ postData }: Props) => {
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [isEditingPost, setIsEditingPost] = useState(false);

  const {userId} = useAuth();

  const isPending = isDeletingPost || isEditingPost;

  return (
    <div className="flex justify-start items-center gap-3 w-full">
      <Link
        className={cn(isPending && "pointer-events-none")}
        to={`/profile/${postData.user.clerkId}`}
      >
        <Avatar className="shrink-0 outline-2 outline-blue-600 outline-offset-1">
          <AvatarImage src={postData.user.profilePicture} />
          <AvatarFallback>
            {postData.user.fullName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Link>

      <div className="flex flex-col justify-between items-start gap-0 w-full overflow-hidden">
        <Link
          className={cn("w-full font-semibold text-neutral-900 truncate", isPending && "pointer-events-none")}
          to={`/profile/${postData.user.clerkId}`}
        >
          {postData.user.fullName}
        </Link>

        <p
          className="text-sm text-neutral-700"
          title={dayjs(postData.createdAt).format("dddd, DD [de] MMMM [de] YYYY [a las] hh:mm a")}
        >
          {dayjs(postData.updatedAt).fromNow().replace("hace", "Hace")}
        </p>
      </div>

      {userId === postData.user.clerkId &&
        <>
          <DeletePostModal
            isOpen={openDeleteModal}
            postId={postData._id}
            setIsDeleting={(bool) => setIsDeletingPost(bool)}
            setIsOpen={setOpenDeleteModal}
          />

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
        </>
      }
    </div>
  )
}

export default PostCardHeader