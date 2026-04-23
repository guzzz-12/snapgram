import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogOverlay, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useKickFromGroup, useLeaveGroup } from "@/services/chats";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useLeaveOrKickUser } from "@/hooks/useLeaveOrKickUser";
import type { ChatType } from "@/types/global";

interface Props {
  chatData: ChatType | null | undefined;
}

const LeaveOrKickFromGroupModal = (props: Props) => {
  const { chatData } = props;

  const {modalState, setModalState} = useLeaveOrKickUser();

  const headerText = modalState.operation === "Eliminar" ? `Eliminar a ${modalState.kickedUser?.fullName.split(" ")[0]} del grupo` : `Salir de ${chatData?.groupName}`;

  const {user: currentUser} = useCurrentUser();

  // Mutation para abandonar el grupo
  const {leaveGroup, isLeaving} = useLeaveGroup({
    currentUser,
    chatData
  });

  // Mutation para expulsar a un usuario del grupo
  const {kickUser, isKicking} = useKickFromGroup({chatData});

  return (
    <Dialog
      open={modalState.isOpen}
      onOpenChange={(isOpen) => {
        if (!isLeaving && !isKicking && !isOpen) {
          setModalState({...modalState, isOpen: false});
        }
      }}
    >
      <DialogOverlay className="bg-black/70" />

      <DialogContent className="w-full !max-w-[340px]">
        <DialogHeader className="overflow-hidden">
          <DialogTitle className="w-full font-medium truncate">
            {headerText}
          </DialogTitle>
        </DialogHeader>

        <DialogFooter>
          <Button
            className="w-[90px] cursor-pointer"
            size="sm"
            variant="outline"
            disabled={isLeaving || isKicking}
            onClick={() => setModalState({...modalState, isOpen: false})}
          >
            Cancelar
          </Button>

          <Button
            className="w-[90px] cursor-pointer"
            size="sm"
            variant="destructive"
            disabled={isLeaving || isKicking}
            onClick={() => {
              if (modalState.operation === "Abandonar") {
                leaveGroup();
              } else if (modalState.operation === "Eliminar") {
                kickUser();
              }
            }}
          >
            {modalState.operation === "Abandonar" ? "Salir" : "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default LeaveOrKickFromGroupModal