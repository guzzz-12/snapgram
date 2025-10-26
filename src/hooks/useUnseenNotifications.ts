import { create } from "zustand";

interface State {
  unseenNotifications: number;
  setUnseenNotifications: (count: number) => void
}

export const useUnseenNotifications = create<State>((set) => ({
  unseenNotifications: 0,
  setUnseenNotifications: (count) => set({ unseenNotifications: count }),
}));