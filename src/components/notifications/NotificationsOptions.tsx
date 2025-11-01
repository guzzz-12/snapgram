import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { FaCheck } from "react-icons/fa6";
import { Ellipsis } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { axiosInstance } from "@/utils/axiosInstance";

const NotificationsOptions = () => {
  const { getToken } = useAuth();

  const queryClient = useQueryClient();

  // Marcar todas las notificaciones como leídas
  const {mutate: markAllAsRead, isPending} = useMutation({
    mutationFn: async () => {
      const token = await getToken();

      return axiosInstance({
        method: "PUT",
        url: "/notifications/mark-all-as-read",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ["notifications"]});
    }
  });


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="shrink-0 rounded-full hover:bg-slate-100 cursor-pointer"
          variant="ghost"
          size="icon"
        >
          <Ellipsis className="size-6 shrink-0 text-neutral-700" aria-hidden />
          <span className="sr-only">Opciones de las notificaciones</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <DropdownMenuItem
          className="cursor-pointer"
          disabled={isPending}
          onClick={() => markAllAsRead()}
        >
          <FaCheck className="text-neutral-700" aria-hidden />
          <span className="text-sm text-neutral-900">
            Marcar todas como leídas
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default NotificationsOptions