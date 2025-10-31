import { io, Socket } from "socket.io-client";
import type { ClientEvents, ServerEvents } from "@/types/socketTypes";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

export const socket: Socket<ServerEvents, ClientEvents> = io(SERVER_URL, {
  autoConnect: false,
  path: "/api/socket/"
});