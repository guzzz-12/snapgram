import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/search/search-users", () => {
    return HttpResponse.json({
      data: [],
      hasMore: false,
      nextPage: null
    });
  }),

  http.get("/api/search/search-posts", () => {
    return HttpResponse.json({
      data: [],
      hasMore: false,
      nextPage: null,
      totalResults: 0
    });
  })
];
