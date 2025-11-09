import { create } from "zustand";
import type { TypingEventData } from "@/types/socketTypes";

interface State {
  usersTyping: TypingEventData[];
  addToUsersTyping: (data: TypingEventData) => void;
  removeFromUsersTyping: (userId: string) => void;
}

export const useUsersTyping = create<State>((set) => ({
  usersTyping: [],
  addToUsersTyping: (data) => set((state) => {
    if (state.usersTyping.find((u) => u.user._id === data.user._id)) {
      return state;
    }

    return { 
      usersTyping: [...state.usersTyping, data] 
    }
  }),
  removeFromUsersTyping: (userId) => set((state) => {
    return {
      usersTyping: state.usersTyping.filter((user) => user.user._id !== userId)
    }
  })
}))