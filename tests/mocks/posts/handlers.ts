import { http, HttpResponse } from "msw";
import { mockPostsDb } from "./postsRepository";
import { buildMockPost, buildMockPostWithLikes } from "./factories";

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

  http.get("/api/posts/:postId", ({ params }) => {
    const post = mockPostsDb.getPostById(params.postId as string);

    if (!post) {
      return HttpResponse.json(
        { message: "Publicación no encontrada" },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      data: buildMockPostWithLikes({
        _id: post._id,
        content: post.content,
        imageUrls: post.imageUrls,
        postType: post.postType
      })
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
  }),

  http.put("/api/posts/:postId", async ({ params, request }) => {
    const { content } = (await request.json()) as { content: string };
    const postId = params.postId as string;
    const updated = mockPostsDb.updatePost(postId, content);

    return HttpResponse.json({
      data: buildMockPostWithLikes({
        _id: postId,
        content: updated?.content ?? content
      })
    });
  }),

  http.delete("/api/posts/:postId", ({ params }) => {
    mockPostsDb.deletePost(params.postId as string);
    return HttpResponse.json({ message: "Publicación eliminada" });
  }),

  http.post("/api/posts/share/:postId", async ({ params, request }) => {
    const { content } = (await request.json()) as { content: string };
    const original = mockPostsDb.getPostById(params.postId as string) ?? buildMockPost({ _id: params.postId as string });

    return HttpResponse.json({
      data: buildMockPostWithLikes({
        content,
        postType: "repost",
        originalPost: original
      })
    });
  }),

  http.post("/api/likes/post/:postId", ({ params }) => {
    return HttpResponse.json({
      data: {
        postId: params.postId
      }
    });
  })
];