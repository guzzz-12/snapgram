import { http, HttpResponse } from "msw";
import { buildMockComment } from "./factories";

export const handlers = [
  http.get("/api/comments/posts/:postId", () => {
    return HttpResponse.json({
      data: [],
      hasMore: false,
      nextPage: null
    });
  }),

  http.get("/api/comments/replies/comment/:commentId", () => {
    return HttpResponse.json({
      data: [],
      hasMore: false,
      nextPage: null
    });
  }),

  http.post("/api/comments/posts/:postId", async ({ params, request }) => {
    const formData = await request.formData();
    const content = formData.get("content")?.toString() ?? "";

    return HttpResponse.json({
      data: buildMockComment({
        post: {
          _id: params.postId as string,
          userId: "user_owner_mock"
        },
        content
      })
    });
  }),

  http.put("/api/comments/:commentId", async ({ params, request }) => {
    const { content } = (await request.json()) as { content: string };

    return HttpResponse.json({
      data: buildMockComment({
        _id: params.commentId as string,
        content
      })
    });
  }),

  http.delete("/api/comments/:commentId", ({ params }) => {
    return HttpResponse.json({
      message: `Comentario ${params.commentId} eliminado`
    });
  })
];
