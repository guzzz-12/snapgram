import { http, HttpResponse } from "msw";
import { buildMockChat, buildMockMessage } from "./factories";

export const handlers = [
  http.get("/api/chats", () => {
    return HttpResponse.json({
      data: [],
      hasMore: false,
      nextPage: null
    });
  }),

  http.get("/api/chats/get-unread-chats", () => {
    return HttpResponse.json({ data: [] });
  }),

  http.get("/api/chats/:chatId", ({ params }) => {
    return HttpResponse.json({
      data: buildMockChat({ _id: params.chatId as string }),
      isBlocked: {
        blockedBy: null,
        blockedUser: null
      }
    });
  }),

  http.get("/api/messages/chat/:chatId", ({ params }) => {
    const chatId = params.chatId as string;

    return HttpResponse.json({
      data: {
        messages: [],
        chat: buildMockChat({ _id: chatId })
      },
      hasMore: false,
      nextPage: null
    });
  }),

  http.post("/api/messages/send", async ({ request }) => {
    const body = (await request.json()) as {
      text: string;
      chatId: string;
      type: "text" | "image" | "audio" | "imageWithText";
      fileUrls: string;
      fileIds: string[];
      encryptedKeys: { userId: string; encryptedKey: string }[];
      initVector: string;
    };

    const message = buildMockMessage({
      chat: body.chatId,
      text: body.text,
      type: body.type,
      fileUrls: body.fileUrls || null,
      fileIds: body.fileIds,
      cryptoKeys: body.encryptedKeys,
      initVector: body.initVector
    });

    return HttpResponse.json({
      data: message,
      isNewChat: false,
      chat: null
    });
  }),

  http.put("/api/messages/edit/:chatId/:messageId", async ({ params, request }) => {
    const body = (await request.json()) as { text: string; iv: string };

    return HttpResponse.json({
      data: buildMockMessage({
        _id: params.messageId as string,
        chat: params.chatId as string,
        text: body.text,
        initVector: body.iv
      })
    });
  }),

  http.delete("/api/messages/delete/:chatId/:messageId", ({ params, request }) => {
    const url = new URL(request.url);
    const deleteFor = url.searchParams.get("deleteFor");

    return HttpResponse.json({
      data: buildMockMessage({
        _id: params.messageId as string,
        chat: params.chatId as string,
        deletedForAll: deleteFor === "all"
      })
    });
  }),

  http.post("/api/chats/create", async ({ request }) => {
    const body = (await request.json()) as {
      groupName: string;
      participants: string[];
      groupAdmin: string;
    };

    return HttpResponse.json({
      data: buildMockChat({
        type: "group",
        groupName: body.groupName
      })
    });
  }),

  http.put("/api/chats/group/:chatId/leave", ({ params }) => {
    return HttpResponse.json({
      data: buildMockChat({
        _id: params.chatId as string,
        type: "group"
      })
    });
  }),

  http.put("/api/chats/group/:chatId/kick", ({ params }) => {
    return HttpResponse.json({
      data: buildMockChat({
        _id: params.chatId as string,
        type: "group"
      })
    });
  }),

  http.put("/api/chats/group/:chatId/update-info", async ({ params, request }) => {
    const body = (await request.json()) as {
      groupName: string;
      groupDescription: string;
    };

    return HttpResponse.json({
      data: buildMockChat({
        _id: params.chatId as string,
        type: "group",
        groupName: body.groupName,
        groupDescription: body.groupDescription
      })
    });
  }),

  http.put("/api/chats/group/:chatId/add-members", ({ params }) => {
    return HttpResponse.json({
      data: buildMockChat({
        _id: params.chatId as string,
        type: "group"
      })
    });
  })
];
