import { create } from "zustand";

interface State {
  searchType: "people" | "posts" | null;
  isSearching: boolean;
  setSearchType: (type: "people" | "posts" | null) => void;
  setIsSearching: (status: boolean) => void;
}

export const useSearchStatus = create<State>((set) => ({
  searchType: null,
  isSearching: false,
  setSearchType: (type) => set({ searchType: type }),
  setIsSearching: (status) => set({ isSearching: status }),
}));