import { create } from "zustand";

interface State {
  unreadChats: string[];
  addToUnreadChats: (chatIds: string | string[]) => void;
  removeFromUnreadChats: (chatId: string) => void;
}

export const useUnreadChats = create<State>((set) => ({
  unreadChats: [],
  addToUnreadChats: (chatIds) => set((state) => {
    const update = [...new Set([...state.unreadChats.concat(chatIds)])];
    return { unreadChats: update }
  }),
  removeFromUnreadChats: (chatId) => set((state) => {
    return { unreadChats: state.unreadChats.filter((id) => id !== chatId) }
  }),
}));