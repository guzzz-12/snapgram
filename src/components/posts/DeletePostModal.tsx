import { useLocation, useSearchParams } from "react-router";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogOverlay, DialogTitle } from "../ui/dialog";
import { usePostsService } from "@/services/postsService";

interface Props {
  postId: string;
  isOpen: boolean;
  setIsDeleting: (isDeleting: boolean) => void;
  setIsOpen: (isOpen: boolean) => void;
}

const DeletePostModal = ({postId, isOpen, setIsDeleting, setIsOpen}: Props) => {
  const {pathname} = useLocation();
  const [seachParams] = useSearchParams();
  const searchTerm = seachParams.get("searchTerm");

  const {deletePost} = usePostsService();

  const {mutate, isPending} = deletePost({
    postId,
    pathname,
    searchTerm,
    setIsDeleting,
    setIsOpen
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