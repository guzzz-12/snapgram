import { create } from "zustand";
import type { UserType } from "@/types/global";

interface State {
  open: boolean;
  blockedUser: UserType | null | undefined;
  operation: "block" | "unblock";
  setOpen: (open: boolean) => void;
  setOperation: (operation: "block" | "unblock") => void;
  setBlockedUser: (blockedUser: UserType | null | undefined) => void;
}

export const useBlockUserModal = create<State>((set) => ({
  open: false,
  blockedUser: null,
  operation: "block",
  setOpen: (open: boolean) => set({ open }),
  setOperation: (operation: "block" | "unblock") => set({ operation }),
  setBlockedUser: (blockedUser: UserType | null | undefined) => set({ blockedUser }),
}));