import { http, HttpResponse } from "msw";
import { mockPostsDb } from "./postsRepository";

export const handlers = [
  http.get("/api/posts", ({request}) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page")) || 1;
    const limit = 10;

    const data = mockPostsDb.getAllPosts();

    data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedData = data.slice(start, end);
    const hasMore = end < data.length;

    return HttpResponse.json({
      data: paginatedData,
      hasMore: hasMore,
      nextPage: hasMore ? page + 1 : null,
    });
  }),

  http.post("/api/posts", async ({request}) => {
    const {content} = await request.json() as {
      content: string;
    };

    const newPost = mockPostsDb.createPost({
      textContent: content,
    });

    return HttpResponse.json({data: newPost});
  })
];