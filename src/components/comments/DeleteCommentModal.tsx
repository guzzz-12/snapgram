import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogOverlay, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";

interface Props {
  isOpen: boolean;
  commentId: string;
  postId: string;
  setIsDeleting: (isDeleting: boolean) => void;
  setIsOpen: (isOpen: boolean) => void;
}

const DeleteCommentModal = ({isOpen, commentId, postId, setIsOpen, setIsDeleting}: Props) => {
  const {getToken} = useAuth();
  const queryClient = useQueryClient();

  const {mutate, isPending} = useMutation({
    mutationFn: async () => {
      const token = await getToken();

      return axiosInstance({
        method: "DELETE",
        url: `/comments/${commentId}`,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ["postComments", postId]});
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
            onClick={() =>{
              setIsDeleting(true);
              mutate();
            }}
          >
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DeleteCommentModal