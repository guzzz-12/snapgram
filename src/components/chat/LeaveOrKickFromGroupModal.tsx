import { type Dispatch, type SetStateAction } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogOverlay, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { errorMessage } from "@/utils/errorMessage";
import { axiosInstance } from "@/utils/axiosInstance";
import type { ChatType, UserType } from "@/types/global";

type Operation = "Abandonar" | "Eliminar" | null;

interface Props {
  chatData: ChatType | null | undefined;
  modalState: { isOpen: boolean; operation: Operation; kickedUser?: UserType };
  setModalState: Dispatch<SetStateAction<{ isOpen: boolean; operation: Operation }>>;
}

const LeaveOrKickFromGroupModal = (props: Props) => {
  const { chatData, modalState, setModalState } = props;

  const headerText = modalState.operation === "Eliminar" ? `Eliminar a ${modalState.kickedUser?.fullName.split(" ")[0]} del grupo` : `Salir de ${chatData?.groupName}`;

  const navigate = useNavigate();

  const {getToken} = useAuth();

  const queryClient = useQueryClient();

  const {user: currentUser} = useCurrentUser();

  // Mutation para abandonar el grupo
  const {mutate: leaveGroup, isPending} = useMutation({
    mutationFn: async () => {
      if (!chatData || !currentUser) return;

      const token = await getToken();

      const {data} = await axiosInstance<{data: ChatType}>({
        method: "PUT",
        url: `/chats/group/${chatData._id}/leave`,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["chats", "all"]});
      navigate("/messages?type=all", {replace: true});
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    }
  });

  return (
    <Dialog
      open={modalState.isOpen}
      onOpenChange={(isOpen) => {
        if (!isPending && !isOpen) {
          setModalState(prev => ({...prev, isOpen: false}));
        }
      }}
    >
      <DialogOverlay className="bg-black/70" />

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {headerText}
          </DialogTitle>
        </DialogHeader>

        <DialogFooter>
          <Button
            className="cursor-pointer"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => setModalState(prev => ({...prev, isOpen: false}))}
          >
            Cancelar
          </Button>

          <Button
            className="cursor-pointer"
            size="sm"
            variant="destructive"
            disabled={isPending}
            onClick={() => leaveGroup()}
          >
            {modalState.operation}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default LeaveOrKickFromGroupModal