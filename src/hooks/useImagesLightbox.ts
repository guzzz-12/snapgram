import { create } from "zustand";

interface State {
  images: string[];
  initialIndex?: number;
  open: boolean;
  setImages: (imgs: string[]) => void;
  setInitialIndex: (index: number) => void;
  setOpen: (open: boolean) => void;
}

/** State global del visor de imágenes */
export const useImagesLighbox = create<State>((set) => ({
  images: [],
  initialIndex: 0,
  open: false,
  setImages: (imgs) => set({images: imgs}),
  setInitialIndex: (idx) => set({initialIndex: idx}),
  setOpen: (open) => set({open})
}));