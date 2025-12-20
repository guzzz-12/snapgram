import { create } from "zustand";
import type { TypingEventData } from "@/types/socketTypes";

interface State {
  usersRecordingAudio: TypingEventData[];
  addToUsersRecordingAudio: (data: TypingEventData) => void;
  removeFromUsersRecordingAudio: (userId: string) => void;
}

export const useUsersRecordingAudio = create<State>((set) => ({
  usersRecordingAudio: [],
  addToUsersRecordingAudio: (data) => set((state) => {
    if (state.usersRecordingAudio.find((u) => u.user._id === data.user._id)) {
      return state;
    }

    return { 
      usersRecordingAudio: [...state.usersRecordingAudio, data] 
    }
  }),
  removeFromUsersRecordingAudio: (userId) => set((state) => {
    return {
      usersRecordingAudio: state.usersRecordingAudio.filter((user) => user.user._id !== userId)
    }
  })
}));