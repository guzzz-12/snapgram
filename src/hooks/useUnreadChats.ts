import { create } from "zustand";

interface State {
  unreadChats: number;
  setUnreadChats: (count: number) => void;
}

export const useUnreadChats = create<State>((set) => ({
  unreadChats: 0,
  setUnreadChats: (count) => set({ unreadChats: count }),
}));