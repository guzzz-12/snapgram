import { create } from "zustand";

interface State {
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
}

/** State global del width del sidebar principal */
const useSidebarWidth = create<State>((set) => ({
  sidebarWidth: 0,
  setSidebarWidth: (width: number) => set({ sidebarWidth: width }),
}));

export default useSidebarWidth;