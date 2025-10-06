import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";

interface Props {
  isOpen: boolean;
  isLoading: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onDelete: () => void;
}

const DeleteAvatarModal = ({ isOpen, isLoading, setIsOpen, onDelete }: Props) => {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(isOpen) => {
        if (!isLoading) {
          setIsOpen(isOpen);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Eliminar foto de perfil?</DialogTitle>
          
          <DialogDescription>
            Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            className=""
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            className=""
            variant="destructive"
            onClick={onDelete}
            disabled={isLoading}
          >
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DeleteAvatarModal