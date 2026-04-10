import { IoWarningOutline } from "react-icons/io5";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDeleteGroup } from "@/services/chats";
import type { ChatType } from "@/types/global";

interface Props {
  groupData: ChatType | null | undefined;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const DeleteGroupModal = ({ groupData, isOpen, setIsOpen }: Props) => {
  const {mutate, isPending} = useDeleteGroup(groupData);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(isOpen) => {
        setIsOpen(isOpen);
      }}
    >
      <DialogOverlay className="bg-black/70" />

      <DialogContent className="w-full !max-w-[400px]">
        <DialogHeader className="overflow-hidden">
          <DialogTitle className="w-full font-medium truncate">
            ¿Eliminar {groupData?.groupName}?
          </DialogTitle>

          <DialogDescription asChild>
            <div className="flex justify-start items-center gap-2 w-full">
              <IoWarningOutline className="size-8 text-orange-600 shrink-0" />
              <p className="text-sm text-neutral-700">
                Esto eliminará permanentemente los mensajes y todos los archivos asociados. Esta acción no se puede deshacer.
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

export default DeleteGroupModal