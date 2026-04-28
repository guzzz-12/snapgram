import { setupServer } from "msw/node";
import { handlers } from "./notifications/handlers";

export const server = setupServer(...handlers);