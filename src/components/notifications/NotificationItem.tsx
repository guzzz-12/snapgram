import { useState } from "react";
import { Link } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import dayjs from "dayjs";
import { Ellipsis, Trash2Icon } from "lucide-react";
import { GoDotFill } from "react-icons/go";
import { toast } from "sonner";
import NotificationIcon from "./NotificationIcon";
import DeleteConfirmModal from "../DeleteConfirmModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Comment, NotificationType, PostType, UserType } from "@/types/global";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/utils/errorMessage";
import { axiosInstance } from "@/utils/axiosInstance";
import { NOTIFICATIONS_TEXT_MAP } from "@/utils/constants";
import { cn } from "@/lib/utils";

interface Props {
  data: NotificationType;
}

// La notificación se hizo sobre un post cuando es like o comment
const isItemPost = (item: any): item is PostType => {
  if (!item) return false;
  return "postType" in item;
}

// La notificación se hizo sobre un user cuando es follow
const isItemUser = (item: any): item is UserType => {
  if (!item) return false;
  return "clerkId" in item;
}

// La notificación se hizo sobre un comment cuando es reply
const isItemComment = (item: any): item is Comment => {
  if (!item) return false;
  return "commentType" in item;
}

const NotificationItem = ({ data }: Props) => {
  const { sender, notificationType, onItem, isSeen, isRead } = data;

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [showDropdownTrigger, setShowDropdownTrigger] = useState(false);

  const queryClient = useQueryClient();

  const { getToken } = useAuth();
  
  const markAsRead = async (notificationId: string) => {
    const token = await getToken();

    await axiosInstance({
      method: "PUT",
      url: `/notifications/mark-as-read/${notificationId}`,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // Marcar notificacion como leída
  const {mutate: markAsReadMutation} = useMutation({
    mutationFn: markAsRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ["notifications"]});
    }
  });

  // Eliminar notificacion
  const {mutate, isPending} = useMutation({
    mutationFn: async () => {
      const token = await getToken();

      return axiosInstance({
        method: "DELETE",
        url: `/notifications/${data._id}`,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ["notifications"]});
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    }
  });

  // Determinar el user del item de la notificacion segun el tipo de notificacion
  // const notificationUser = (isItemPost(onItem) || isItemComment(onItem)) ? onItem.user : onItem;

  const notificationLink = data.originalPost ? `/post/${data.originalPost._id}` : isItemUser(onItem) ? `/profile/${onItem.clerkId}` : "/";

  return (
    <div
      className={cn("flex justify-start items-center gap-0 w-full p-3 bg-white border rounded-md shadow-md hover:bg-neutral-100 cursor-pointer transition-colors", !isSeen && "bg-[#4F39F6]/20")}
      onMouseEnter={() => setShowDropdownTrigger(true)}
      onMouseLeave={() => setShowDropdownTrigger(false)}
    >
      <DeleteConfirmModal
        title="Eliminar notificación"
        isOpen={openDeleteModal}
        isPending={isPending}
        onDeleteHandler={() => mutate()}
        setIsOpen={() => setOpenDeleteModal(false)}
      />

      <Link
        className="flex gap-3 w-full"
        to={notificationLink}
        onClick={() => markAsReadMutation(data._id)}
      >
        <div className="flex justify-start h-full shrink-0">
          <div className="relative">
            <Avatar className="w-[50px] h-[50px] shrink-0 outline-2 outline-[#4F39F6]">
              <AvatarImage
                className="w-full h-full object-cover"
                src={sender.profilePicture}
                alt={sender.fullName}
              />
              <AvatarFallback className="w-full h-full object-cover">
                {sender.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <NotificationIcon
              className={cn("absolute bottom-0 -right-1 z-10", notificationType === "follow" ? "bg-[#4F39F6]" : notificationType === "like" ? "bg-red-600" : "bg-green-600")}
              notificationType={notificationType}
              aria-hidden
            />
          </div>
        </div>

        <div className="flex flex-col justify-center items-start gap-0 w-full overflow-hidden">
          <p className="text-[15px] text-neutral-900 leading-tight">
            <span>{notificationType === "like" ? "A " : ""}</span>
            
            <span className="font-semibold">
              {sender.fullName}
            </span> {" "}

            {NOTIFICATIONS_TEXT_MAP[notificationType]}
          </p>

          <span
            className="text-sm text-neutral-700"
            title={dayjs(data.createdAt).format("[El] dddd DD [de] MMMM [de] YYYY [a las] hh:mm a")}
          >
            {dayjs(data.createdAt).fromNow()}
          </span>
        </div>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className={cn("opacity-0 rounded-full cursor-pointer hover:bg-slate-200 z-10", showDropdownTrigger && "opacity-100")}
            variant="ghost"
            size="icon"
          >
            <Ellipsis className="size-6 shrink-0 text-neutral-700" aria-hidden />
            <span className="sr-only">Opciones de notificación</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => setOpenDeleteModal(true)}
          >
            <Trash2Icon className="text-destructive" aria-hidden />
            <span className="text-sm text-neutral-900">
              Eliminar notificación
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <GoDotFill className={cn("w-5 h-5 shrink-0 text-[#4F39F6] opacity-0", !isRead && "opacity-100")} />
    </div>
  )
}

export default NotificationItem