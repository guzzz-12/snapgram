import { useAuth } from "@clerk/clerk-react";
import { useMutation } from "@tanstack/react-query";
import { IoWarningOutline } from "react-icons/io5";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";

interface Props {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const DisableAccountModal = ({isOpen, setIsOpen}: Props) => {
  const {getToken, signOut} = useAuth();

  const {mutate: disableAccount, isPending} = useMutation({
    mutationFn: async () => {
      const token = await getToken();

      const {data} = await axiosInstance({
        method: "PUT",
        url: "/users/disable-account",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return data;
    },
    onSuccess: () => {
      toast.success("Tu cuenta ha sido deshabilitada correctamente");

      setTimeout(() => {
        signOut({redirectUrl: "/"});
      }, 1000);
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    }
  });

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (isPending) return;
        setIsOpen(open);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Desactivar tu cuenta?</DialogTitle>
          <Separator className="w-full my-2 bg-neutral-200" />
          <DialogDescription asChild>
            <div className="flex justify-start items-center gap-2 w-full">
              <IoWarningOutline className="size-8 text-destructive shrink-0" />
              <p className="text-sm text-neutral-700">
                Si desactivas tu cuenta se ocultarán tu perfil y todas tus publicaciones. Podrás reactivar tu cuenta nuevamente en cualquier momento iniciando sesión.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
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