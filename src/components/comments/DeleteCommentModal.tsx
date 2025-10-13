import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogOverlay, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";

interface Props {
  isOpen: boolean;
  commentId: string;
  postId: string;
  isPending: boolean;
  onDeleteHandler: () => void;
  setIsOpen: (isOpen: boolean) => void;
}

const DeleteCommentModal = ({isOpen, isPending, onDeleteHandler, setIsOpen}: Props) => {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(isOpen) => {
        if (!isPending) {
          setIsOpen(isOpen);
        }
      }}
    >
      <DialogOverlay className="bg-black/70" />

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Eliminar comentario
          </DialogTitle>
        </DialogHeader>

        <DialogFooter>
          <Button
            className="cursor-pointer"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => setIsOpen(false)}
          >
            Cancelar
          </Button>

          <Button
            className="cursor-pointer"
            size="sm"
            variant="destructive"
            disabled={isPending}
            onClick={onDeleteHandler}
          >
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DeleteCommentModal