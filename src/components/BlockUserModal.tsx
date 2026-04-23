import { useLocation, useNavigate } from "react-router";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { useBlockUser } from "@/services/user";
import { useBlockUserModal } from "@/hooks/useBlockUserModal";

const BlockUserModal = () => {
  const {pathname} = useLocation();
  const navigate = useNavigate();

  const {open, blockedUser, operation, setOpen, setBlockedUser} = useBlockUserModal();

  const onSuccessHandler = () => {
    setBlockedUser(null);

    setOpen(false);

    if (pathname === `/profile/${blockedUser?.clerkId}`) {
      navigate("/", {replace: true});
    }
  }

  // Mutation para bloquear o desbloquear al usuario
  const {mutate, isPending} = useBlockUser({
    blockedUser,
    onSuccess: onSuccessHandler
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