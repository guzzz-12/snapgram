import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStoriesService } from "@/services/storiesService";

interface Props {
  storyId: string;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  setIsPaused: (isPaused: boolean) => void;
}

const DeleteStoryModal = ({ storyId, isOpen, setIsOpen, setIsPaused }: Props) => {
  const { deletStory } = useStoriesService();

  const { deleteStory, isPending, isSuccess } = deletStory(storyId);

  useEffect(() => {
    if (isSuccess) {
      setIsOpen(false);
      setIsPaused(false);
    }
  }, [isSuccess]);

  // Pausar el timer del story al abrir el modal de eliminación
  useEffect(() => {
    if (isOpen) {
      setIsPaused(true);
    }

    return () => {
      setIsPaused(false);
    }

  }, [isOpen]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (isPending) return;
        setIsOpen(open);
      }}
    >
      <DialogContent className="!max-w-[270px]">
        <DialogHeader>
          <DialogTitle>
            Eliminar historia
          </DialogTitle>
        </DialogHeader>

        <DialogFooter>
          <Button
            className="cursor-pointer"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => {
              setIsOpen(false);
              setIsPaused(false);
            }}
          >
            Cancelar
          </Button>
          <Button
            className="cursor-pointer"
            size="sm"
            variant="destructive"
            disabled={isPending}
            onClick={() => deleteStory()}
          >
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DeleteStoryModal