import { create } from "zustand";
import type { UserType } from "@/types/global";

type ModalState = {
  isOpen: boolean;
  operation: "Abandonar" | "Eliminar" | null;
  kickedUser?: UserType;
}

interface State {
  modalState: ModalState;

  setModalState: ({isOpen, operation, kickedUser}: ModalState) => void;
}

/** State global del modal para eliminar un usuario de un grupo o para abandonar un grupo */
export const useLeaveOrKickUser = create<State>((set) => ({
  modalState: {
    isOpen: false,
    operation: null,
    kickedUser: undefined,
  },

  setModalState: (state) => set({modalState: state})
}));