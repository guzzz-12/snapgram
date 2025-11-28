import { type Dispatch, type SetStateAction } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogOverlay, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  const {mutate: leaveGroup, isPending: isLeaving} = useMutation({
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

  // Mutation para expulsar a un usuario del grupo
  const {mutate: kickUser, isPending: isKicking} = useMutation({
    mutationFn: async () => {
      const token = await getToken();

      const {data} = await axiosInstance<{data: ChatType}>({
        method: "PUT",
        url: `/chats/group/${chatData?._id}/kick`,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        data: {
          participantId: modalState.kickedUser?._id
        }
      });

      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ["groupInfo", chatData?._id]});
      toast.success(`Has expulsado a ${modalState.kickedUser?.fullName.split(" ")[0]} del grupo`);
      setModalState(prev => ({...prev, isOpen: false}));
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    }
  });

  return (
    <Dialog
      open={modalState.isOpen}
      onOpenChange={(isOpen) => {
        if (!isLeaving && !isOpen) {
          setModalState(prev => ({...prev, isOpen: false}));
        }
      }}
    >
      <DialogOverlay className="bg-black/70" />

      <DialogContent className="w-full !max-w-[340px]">
        <DialogHeader className="overflow-hidden">
          <DialogTitle className="w-full font-medium truncate">
            {headerText}
          </DialogTitle>
        </DialogHeader>

        <DialogFooter>
          <Button
            className="w-[90px] cursor-pointer"
            size="sm"
            variant="outline"
            disabled={isLeaving || isKicking}
            onClick={() => setModalState(prev => ({...prev, isOpen: false}))}
          >
            Cancelar
          </Button>

          <Button
            className="w-[90px] cursor-pointer"
            size="sm"
            variant="destructive"
            disabled={isLeaving || isKicking}
            onClick={() => {
              if (modalState.operation === "Abandonar") {
                leaveGroup();
              } else if (modalState.operation === "Eliminar") {
                kickUser();
              }
            }}
          >
            {modalState.operation === "Abandonar" ? "Salir" : "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default LeaveOrKickFromGroupModal