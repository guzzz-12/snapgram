import { setupServer } from "msw/node";
import { handlers as notificationHandlers } from "./notifications/handlers";
import { handlers as postHandlers } from "./posts/handlers";

const handlers = [...notificationHandlers, ...postHandlers];

export const server = setupServer(...handlers);