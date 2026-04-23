import { IoWarningOutline } from "react-icons/io5";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useDisableAccount } from "@/services/user";

interface Props {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const DisableAccountModal = ({isOpen, setIsOpen}: Props) => {
  const {disableAccount, isPending} = useDisableAccount();

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (isPending) return;
        setIsOpen(open);
      }}
    >
      <DialogContent className="p-3 min-[400px]:p-6">
        <DialogHeader>
          <DialogTitle>¿Desactivar tu cuenta?</DialogTitle>
          <Separator className="w-full my-2 bg-neutral-200" />
          <DialogDescription asChild>
            <div className="flex justify-start items-center gap-2 w-full text-left">
              <IoWarningOutline className="size-8 text-destructive shrink-0" />
              <p className="text-sm text-neutral-700">
                Si desactivas tu cuenta se ocultarán tu perfil y todas tus publicaciones. Podrás reactivar tu cuenta nuevamente en cualquier momento iniciando sesión.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-row justify-end items-center w-full">
          <Button
            className="w-[90px] cursor-pointer"
            variant="outline"
            disabled={isPending}
            onClick={() => setIsOpen(false)}
          >
            Cancelar
          </Button>

          <Button
            className="w-[90px] cursor-pointer"
            variant="destructive"
            disabled={isPending}
            onClick={() => disableAccount()}
          >
            Deshabilitar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DisableAccountModal