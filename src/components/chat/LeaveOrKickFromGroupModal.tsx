import { type Dispatch, type SetStateAction } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogOverlay, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Operation = "Abandonar" | "Eliminar" | null;

interface Props {
  title: string;
  confirmBtnText: Operation;
  isPending: boolean;
  modalState: { isOpen: boolean; operation: Operation };
  setModalState: Dispatch<SetStateAction<{ isOpen: boolean; operation: Operation }>>;
  callback: () => void;
}

const LeaveOrKickFromGroupModal = (props: Props) => {
  const { title, confirmBtnText, isPending, modalState, setModalState, callback } = props;

  return (
    <Dialog
      open={modalState.isOpen}
      onOpenChange={(isOpen) => {
        if (!isPending && !isOpen) {
          setModalState(prev => ({...prev, isOpen: false}));
        }
      }}
    >
      <DialogOverlay className="bg-black/70" />

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {title}
          </DialogTitle>
        </DialogHeader>

        <DialogFooter>
          <Button
            className="cursor-pointer"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => setModalState(prev => ({...prev, isOpen: false}))}
          >
            Cancelar
          </Button>

          <Button
            className="cursor-pointer"
            size="sm"
            variant="destructive"
            disabled={isPending}
            onClick={callback}
          >
            {confirmBtnText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default LeaveOrKickFromGroupModal