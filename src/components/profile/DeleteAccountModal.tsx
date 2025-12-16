import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth, useReverification } from "@clerk/clerk-react";
import { toast } from "sonner";
import { IoWarningOutline } from "react-icons/io5";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/utils/errorMessage";

interface Props {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  setOpenDisableAccountModal: (open: boolean) => void;
}

const DeleteAccountModal = ({ isOpen, setIsOpen, setOpenDisableAccountModal }: Props) => {
  const navigate = useNavigate();

  const {getToken, signOut} = useAuth();

  const [isPending, setIsPending] = useState(false);

  const deleteAccount = useReverification(async () => {
    const token = await getToken();

    const serverUrl = import.meta.env.VITE_SERVER_URL;

    return fetch(`${serverUrl}/api/users/delete-account`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  });

  const deleteAccountHandler = async () => {
    try {
      setIsPending(true);

      await deleteAccount();

      setIsPending(false);

      await signOut();

      setIsOpen(false);
      
    } catch (error: any) {
      toast.error(errorMessage(error));
      setIsPending(false);
    }
  }

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
          <DialogTitle>Eliminar cuenta permanentemente</DialogTitle>
          <Separator className="w-full my-2 bg-neutral-200" />
          <DialogDescription asChild>
            <div className="flex justify-start items-center gap-2 w-full">
              <IoWarningOutline className="size-8 text-destructive shrink-0" />
              <div className="flex flex-col gap-0 text-left">
                <p className="text-sm text-neutral-700">
                  Si eliminas tu cuenta se eliminarán permanentemente tus datos y todas tus publicaciones. <span className="font-semibold">Esto no se puede deshacer.</span> Alternativamente, puedes <Button className="h-auto px-0.5 py-0 text-left whitespace-break-spaces underline cursor-pointer" variant="link" disabled={isPending} onClick={() => setOpenDisableAccountModal(true)}>desactivar tu cuenta temporalmente.</Button>
                </p>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col items-end min-[400px]:flex-row min-[400px]:justify-end min-[400px]:items-center w-full">
          <Button
            className="w-fit cursor-pointer"
            variant="outline"
            disabled={isPending}
            onClick={() => setIsOpen(false)}
          >
            Cancelar
          </Button>

          <Button
            className="w-fit cursor-pointer"
            variant="destructive"
            disabled={isPending}
            onClick={deleteAccountHandler}
          >
            Eliminar mi cuenta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DeleteAccountModal