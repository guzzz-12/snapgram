import { useLocation, useNavigate } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { useBlockUserModal } from "@/hooks/useBlockUserModal"
import { errorMessage } from "@/utils/errorMessage";
import { axiosInstance } from "@/utils/axiosInstance";
import type { UserType } from "@/types/global";

const BlockUserModal = () => {
  const {pathname} = useLocation();
  const navigate = useNavigate();

  const {getToken} = useAuth();

  const queryClient = useQueryClient();

  const {open, blockedUser, operation, setOpen, setBlockedUser} = useBlockUserModal();

  // Mutation para bloquear o desbloquear al usuario
  const {mutate, isPending} = useMutation({
    mutationFn: async () => {
      if (!blockedUser) return;

      const token = await getToken();

      const {data} = await axiosInstance<{
        data: {
          user: UserType;
          operation: "block" | "unblock";
          chatId: string | null;
        }
      }>({
        method: "PUT",
        url: "/block",
        data: {
          blockedUserId: blockedUser._id
        },
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const message = data.data.operation === "block" ? `Bloqueaste a ${blockedUser.fullName.split(" ")[0]}` : `Desbloqueaste a ${blockedUser.fullName.split(" ")[0]}`;

      toast.success(message);

      return data;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({queryKey: ["blocked-users"]});

      // Invalidar la cache del chat con el usuario bloqueado/desbloqueado
      if (data && data.data.chatId) {
        await queryClient.invalidateQueries({queryKey: ["chat", data.data.chatId]});
      }

      setBlockedUser(null);
      setOpen(false);

      if (pathname === `/profile/${blockedUser?.clerkId}`) {
        navigate("/", {replace: true});
      }
    },
    onError: (error) => {
      const message = errorMessage(error);
      toast.error(message);
    }
  });

  return (
    <Dialog
      open={open && !!blockedUser}
      onOpenChange={(open) => {
        if (!isPending) {
          setOpen(open);
          setBlockedUser(null);
        }
      }}
    >
      <DialogOverlay className="bg-black/70" />

      <DialogContent className="w-fit">
        <DialogHeader>
          <DialogTitle>
            ¿{operation === "block" ? "Bloquear" : "Desbloquear"}
            {" "}
            a {blockedUser?.fullName.split(" ")[0]}?
          </DialogTitle>

          <DialogDescription>
            {operation === "block" && `No podrás interactuar con ${blockedUser?.fullName.split(" ")[0]} ni podrás enviarle mensajes.`}

            {operation === "unblock" && `${blockedUser?.fullName.split(" ")[0]} podrá volver interactuar contigo y enviarte mensajes.`}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            className="min-w-[90px] cursor-pointer"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => {
              setBlockedUser(null);
              setOpen(false);
            }}
          >
            Cancelar
          </Button>

          <Button
            className="min-w-[90px] cursor-pointer"
            size="sm"
            variant="destructive"
            disabled={isPending}
            onClick={() => mutate()}
          >
            Confirmar {operation === "block" ? "bloqueo" : "desbloqueo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default BlockUserModal