import { http, HttpResponse } from "msw";
import { buildMockUser } from "./factories";

export const handlers = [
  http.get("/api/ping", () => {
    return HttpResponse.json({ message: "pong" });
  }),

  http.get("/api/users/me", () => {
    return HttpResponse.json({
      data: buildMockUser({
        isDisabled: false,
        hasCryptoKeys: true
      })
    });
  }),

  http.get("/api/users/search", () => {
    return HttpResponse.json({
      data: [],
      hasMore: false,
      nextPage: null
    });
  }),

  // Debe declararse después de /me y /search para no interceptarlos
  http.get("/api/users/:userClerkId", ({ params }) => {
    return HttpResponse.json({
      data: buildMockUser({ clerkId: params.userClerkId as string })
    });
  }),

  http.get("/api/follows/get-followers/:userId", () => {
    return HttpResponse.json({ data: [], hasMore: false, nextPage: null });
  }),

  http.get("/api/follows/get-following/:userId", () => {
    return HttpResponse.json({ data: [], hasMore: false, nextPage: null });
  }),

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
