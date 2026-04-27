import { http, HttpResponse } from "msw";
import { mockDb } from "./notificationsRepository";

export const handlers = [
  http.get("/api/notifications", ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page")) || 1;
    const activeTab = url.searchParams.get("activeTab") || "all";
    const limit = 5;

    let filteredData = mockDb.getAll();

    if (activeTab === "unread") {
      filteredData = filteredData.filter(n => !n.isRead);
    }

    filteredData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedData = filteredData.slice(start, end);
    const hasMore = end < filteredData.length;

    return HttpResponse.json({
      data: paginatedData,
      hasMore: hasMore,
      nextPage: hasMore ? page + 1 : null,
      total: filteredData.length
    });
  }),

  http.get("/api/notifications/:id", ({ params }) => {
    const { id } = params;
    const notification = mockDb.getById(id as string);
    return HttpResponse.json(notification);
  })
];