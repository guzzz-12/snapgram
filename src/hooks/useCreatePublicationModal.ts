import {create} from "zustand";

type SetOpenType = {
  open: boolean;
  publicationType: "post" | "story" | null;
}

interface State {
  open: boolean;
  publicationType: "post" | "story" | null;
  setOpen: ({open, publicationType}: SetOpenType) => void;
}

export const useCreatePublicationModal = create<State>((set) => ({
  open: false,
  publicationType: null,
  setOpen: ({open, publicationType}) => set({open, publicationType}),
}));