import { create } from "zustand";

interface State {
  unseenNotifications: number;
  setUnseenNotifications: (count: number) => void;
  increaseNotificationsCount: () => void;
}

export const useUnseenNotifications = create<State>((set) => ({
  unseenNotifications: 0,
  setUnseenNotifications: (count) => set({ unseenNotifications: count }),
  increaseNotificationsCount: () => set((state) => {
    return { unseenNotifications: state.unseenNotifications + 1 }
  })
}));