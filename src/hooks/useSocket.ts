import { create } from "zustand";
import { socket } from "@/utils/socket";
import type { OnlineUser } from "@/types/socketTypes";


interface SocketState {
  isConnected: boolean;
  onlineUsers: OnlineUser[];
  setConnected: (isConnected: boolean) => void;
  setOnlineUsers: (onlineUsers: OnlineUser[]) => void;
  connectSocket: ( {token, userId}: {token: string; userId: string}) => void;
  disconnectSocket: () => void;
}


export const useSocketStore = create<SocketState>((set) => ({
  isConnected: false,
  onlineUsers: [],
  setConnected: (isConnected) => set({ isConnected }),
  setOnlineUsers: (onlineUsers) => set({ onlineUsers }),
  connectSocket: ({token, userId}) => {
    if (socket.connected || !token) return; 

    socket.auth = { token: `Bearer ${token}`, userId };

    socket.connect();
  },
  disconnectSocket: () => {
    if (!socket.connected) return;
    socket.disconnect();
  },
}));