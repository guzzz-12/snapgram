import {create} from "zustand";

type PostTypeEnum = "post" | "story" | null;

type SetOpenType = {
  open: boolean;
  publicationType: PostTypeEnum;
  isRepost?: boolean;
  repostedPostId?: string | null;
}

interface State {
  open: boolean;
  publicationType: PostTypeEnum;
  isRepost?: boolean;
  repostedPostId?: string | null;
  setOpen: (data: SetOpenType) => void;
}

export const useCreatePublicationModal = create<State>((set) => ({
  open: false,
  publicationType: null,
  isRepost: false,
  repostedPostId: null,
  setOpen: (data) => set({...data}),
}));