import { http, HttpResponse } from "msw";
import { mockDb } from "./notificationsRepository";

export const handlers = [
  http.get("/api/notifications", ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page")) || 1;
    const filter = url.searchParams.get("filter") || "all";
    const limit = 10;

    let data = mockDb.getAll();

    if (filter === "unread") {
      data = mockDb.filterByStatus("unread");
    }

    data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedData = data.slice(start, end);
    const hasMore = end < data.length;

    return HttpResponse.json({
      data: paginatedData,
      hasMore: hasMore,
      nextPage: hasMore ? page + 1 : null,
      total: data.length
    });
  }),

  http.get("/api/notifications/:id", ({ params }) => {
    const { id } = params;
    const notification = mockDb.getById(id as string);
    return HttpResponse.json(notification);
  }),

  http.put("/api/notifications/unseen", () => {
    mockDb.markAllAssSeen();
    return HttpResponse.json("Success");
  }),

  http.put("/api/notifications/mark-all-as-read", () => {
    mockDb.markAllAsRead();
    return HttpResponse.json("Success");
  }),
];