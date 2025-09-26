import {create} from "zustand";

interface State {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const useCreateStoryModal = create<State>((set) => ({
  open: false,
  setOpen: (open: boolean) => set({open})
}));