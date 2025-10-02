import type { UserType } from "@/types/global"
import { create } from "zustand";

interface State {
  user: UserType | null;
  loadingUser: boolean;
  setUser: (user: UserType | null) => void;
  setLoadingUser: (loadingUser: boolean) => void;
}

export const useCurrentUser = create<State>((set) => ({
  user: null,
  loadingUser: true,
  setUser: (user) => set({user}),
  setLoadingUser: (loadingUser) => set({loadingUser}),
}));