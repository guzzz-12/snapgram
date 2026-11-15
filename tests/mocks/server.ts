import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { handlers as notificationHandlers } from "./notifications/handlers";
import { handlers as postHandlers } from "./posts/handlers";

const storageHandlers = [
  http.post("/api/storage/upload-signature", async ({ request }) => {
    const { amount = 1 } = (await request.json()) as { amount?: number };

    const signatures = Array.from({ length: amount }, (_, index) => ({
      expire: 1700000000 + index,
      signature: `mock-signature-${index + 1}`,
      token: `mock-token-${index + 1}`
    }));

    return HttpResponse.json({ data: signatures });
  })
];

const handlers = [...notificationHandlers, ...postHandlers, ...storageHandlers];

export const server = setupServer(...handlers);