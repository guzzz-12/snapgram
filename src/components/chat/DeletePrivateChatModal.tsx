import { useNavigate } from "react-router";
import { IoWarningOutline } from "react-icons/io5";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDeletePrivateChat } from "@/services/chats";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { ChatType } from "@/types/global";

interface Props {
  chatData: ChatType | null | undefined;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const DeletePrivateChatModal = ({chatData, isOpen, setIsOpen}: Props) => {
  const navigate = useNavigate();

  const {user: currentUser} = useCurrentUser();

  const otherUser = chatData?.participants.find((p) => p._id !== currentUser?._id)!;

  const onSuccessHandler = () => {
    toast.success("Chat eliminado con éxito");
    navigate("/messages?type=all", {replace: true});
    setIsOpen(false);
  }

  const {mutate, isPending} = useDeletePrivateChat({
    currentUser,
    chatData,
    onSuccess: onSuccessHandler
  });

  if (!chatData || !otherUser) return null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(isOpen) => {
        if (!isPending) return;
        setIsOpen(isOpen);
      }}
    >
      <DialogOverlay className="bg-black/70" />

      <DialogContent>
        <DialogHeader className="overflow-hidden">
          <DialogTitle className="truncate">
            Eliminar chat con {otherUser.fullName.split(" ")[0]}
          </DialogTitle>

          <DialogDescription asChild>
            <div className="flex justify-start items-center gap-2 w-full">
              <IoWarningOutline className="size-8 text-orange-600 shrink-0" />
              <p className="text-sm text-neutral-700">
                Se eliminará tu copia de la conversación sólo para ti.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            className="w-[90px] cursor-pointer"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => setIsOpen(false)}
          >
            Cancelar
          </Button>

          <Button
            className="w-[90px] cursor-pointer"
            size="sm"
            variant="destructive"
            disabled={isPending}
            onClick={() => mutate()}
          >
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DeletePrivateChatModal