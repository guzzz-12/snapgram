import { useSearchParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogOverlay, DialogTitle } from "../ui/dialog";
import { errorMessage } from "@/utils/errorMessage";
import { axiosInstance } from "@/utils/axiosInstance";

interface Props {
  postId: string;
  isOpen: boolean;
  setIsDeleting: (isDeleting: boolean) => void;
  setIsOpen: (isOpen: boolean) => void;
}

const DeletePostModal = ({postId, isOpen, setIsDeleting, setIsOpen}: Props) => {
  const [seachParams] = useSearchParams();
  const searchTerm = seachParams.get("searchTerm");

  const {getToken} = useAuth();
  const queryClient = useQueryClient();

  const deletePost = async () => {
    const token = await getToken();

    return axiosInstance({
      method: "DELETE",
      url: `/posts/${postId}`,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  const {mutate, isPending} = useMutation({
    mutationFn: deletePost,
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ["posts"]});

      if (searchTerm) {
        await queryClient.invalidateQueries({queryKey: ["search", searchTerm, "posts"]});
      }

      toast.success("Post eliminado con éxito.");
      
      setIsOpen(false);
    },
    onError: (error) => {
      const message = errorMessage(error);
      toast.error(message);
    },
    onSettled: () => {
      setIsDeleting(false);
    }
  });

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(isOpen) => {
        if (!isOpen && !isPending) {
          setIsOpen(false);
        };
      }}
    >
      <DialogOverlay className="bg-black/70" />

      <DialogContent className="!max-w-[270px]">
        <DialogHeader>
          <DialogTitle>
            Eliminar post
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

export default DeletePostModal