import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { errorMessage } from "@/utils/errorMessage";
import { axiosInstance } from "@/utils/axiosInstance";

interface Props {
  storyId: string;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  setOpenUserId: (storyId: string | null) => void;
}

const DeleteStoryModal = ({storyId, isOpen, setIsOpen, setOpenUserId}: Props) => {
  const {getToken} = useAuth();

  const queryClient = useQueryClient();

  const {mutate: deleteStory, isPending} = useMutation({
    mutationKey: ["deleteStory"],
    mutationFn: async () => {
      const token = await getToken();

      return axiosInstance({
        method: "DELETE",
        url: `/stories/${storyId}`,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["stories"]});
      setIsOpen(false);
    },
    onError: (error) => {
      const message = errorMessage(error);
      toast.error(message);
    }
  });

  return (
    <Dialog
      open={isOpen}
      onOpenChange={() => {
        if (isPending) return;
        setOpenUserId(null);
        setIsOpen(false);
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
            onClick={() => setIsOpen(false)}
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