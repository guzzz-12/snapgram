import { create } from "zustand";
import type { ChatType } from "@/types/global";

interface State {
  chat: ChatType | null;
  setChat: (chat: ChatType | null) => void;
}

/** State global del chat temporal privado */
export const useTemporaryChat = create<State>((set) => ({
  chat: null,
  setChat: (chat) => set({ chat })
}));