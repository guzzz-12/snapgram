import { http, HttpResponse } from "msw";
import { buildMockUser } from "./factories";

export const handlers = [
  http.post("/api/follows/follow-or-unfollow", async ({ request }) => {
    const { userId } = (await request.json()) as { userId?: string };

    return HttpResponse.json({
      message: "Estado de seguimiento actualizado",
      data: { userId }
    });
  }),

  http.put("/api/block", async ({ request }) => {
    const { blockedUserId } = (await request.json()) as { blockedUserId: string };

    return HttpResponse.json({
      data: {
        user: buildMockUser({ _id: blockedUserId }),
        operation: "block" as const,
        chatId: null
      }
    });
  }),

  http.put("/api/users/update-user", async ({ request }) => {
    const body = (await request.json()) as {
      fullName: string;
      username: string;
      bio?: string;
    };

    return HttpResponse.json({
      data: buildMockUser({
        fullName: body.fullName,
        username: body.username,
        bio: body.bio ?? ""
      })
    });
  }),

  http.put("/api/users/disable-account", () => {
    return HttpResponse.json({
      message: "Cuenta deshabilitada correctamente"
    });
  }),

  http.put("/api/users/reactivate-account", () => {
    return HttpResponse.json({
      message: "Cuenta reactivada correctamente"
    });
  })
];
