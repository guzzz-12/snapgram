import { create } from "zustand";

interface State {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const usePrivateChatsListModal = create<State>((set) => ({
  isOpen: false,
  setIsOpen: (isOpen: boolean) => set({ isOpen }),
}))