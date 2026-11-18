import { http, HttpResponse } from "msw";
import { buildMockStory, buildMockUserWithStories } from "./factories";

export const handlers = [
  http.get("/api/stories/:username", ({ params }) => {
    const username = params.username as string;

    return HttpResponse.json({
      data: buildMockUserWithStories({ username })
    });
  }),

  http.post("/api/stories/create", async ({ request }) => {
    const rawBody = await request.text();
    const extractField = (name: string) => {
      const match = rawBody.match(
        new RegExp(`name="${name}"\\r?\\n\\r?\\n([^\\r\\n]*)`)
      );
      return match?.[1];
    };

    const content = extractField("content") ?? "";
    const mediaType =
      (extractField("mediaType") as "text" | "image") ?? "text";
    const backgroundColor = extractField("backgroundColor") ?? "#1d4ed8";
    const textColor = extractField("textColor") ?? "#fff";
    const textBgColor = extractField("textBgColor") ?? "transparent";
    const imageSize =
      (extractField("imageSize") as "cover" | "contain") ?? "cover";

    return HttpResponse.json({
      data: buildMockStory({
        content,
        mediaType,
        backgroundColor,
        textColor,
        textBgColor,
        imageSize
      })
    });
  }),

  http.put("/api/likes/story/:storyId", ({ params }) => {
    return HttpResponse.json({
      data: buildMockStory({ _id: params.storyId as string })
    });
  }),

  http.put("/api/stories/seen/:storyId", ({ params }) => {
    return HttpResponse.json({
      message: `Historia ${params.storyId} marcada como vista`
    });
  }),

  http.delete("/api/stories/:storyId", ({ params }) => {
    return HttpResponse.json({
      data: {
        message: `Historia ${params.storyId} eliminada`
      }
    });
  })
];
