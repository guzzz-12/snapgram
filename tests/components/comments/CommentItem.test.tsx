import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ImageKitProvider } from "@imagekit/react";
import { http, HttpResponse } from "msw";
import CommentItem from "@/components/comments/CommentItem";
import "@/utils/dayJsInstance";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthContext, type AuthContext as AuthContextType } from "@/providers/AuthProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { server } from "../../mocks/server";
import { buildMockUser } from "../../mocks/users/factories";
import { buildMockComment } from "../../mocks/comments/factories";

/**
 * Suite de integración para comentarios y respuestas anidadas
 * (`src/components/comments/CommentItem.tsx`, `CommentDropdown.tsx` y `CommentFooter.tsx`).
 *
 * Propósito:
 *   Validar el ciclo completo de un comentario en publicaciones: edición inline, eliminación
 *   confirmada, control de permisos en el menú de opciones, historial de cambios y carga
 *   perezosa/paginada de respuestas anidadas.
 *
 * Qué evalúa y alcance (SUTs):
 *   - `CommentItem` & `CommentEditInputBtns`: edición inline de comentario propio validando
 *     cambios en el texto y enviando `PUT /api/comments/:id`.
 *   - `CommentDropdown` & `ConfirmationModal`: ocultamiento de `"Editar"` y `"Eliminar"` a
 *     usuarios terceros y eliminación confirmada mediante `DELETE /api/comments/:id`.
 *   - `CommentFooter` & `EditHistoryModal`: visibilidad condicional del botón `"Editado"` y
 *     despliegue de versiones previas únicamente cuando `changeLog.length > 0`.
 *   - Respuestas anidadas (`useGetCommentReplies`): mantenimiento de la consulta inactiva hasta
 *     activar `openReplies`, carga inicial, paginación con `"Ver más respuestas"`, envío de
 *     nueva respuesta con `parentId` vía `POST /api/comments/posts/:postId` y cierre con `"Cancelar"`.
 */
describe("CommentItem", () => {
  let queryClient: QueryClient;

  const authorUser = buildMockUser({
    _id: "usr_author_1",
    clerkId: "clerk_author_1",
    fullName: "Lucía Autora",
    username: "lucia_a"
  });

  const otherUser = buildMockUser({
    _id: "usr_other_2",
    clerkId: "clerk_other_2",
    fullName: "Mateo Lector",
    username: "mateo_l"
  });

  const renderWithProviders = (
    ui: React.ReactElement,
    authUser = authorUser
  ) => {
    useCurrentUser.setState({ user: authUser, loadingUser: false });

    const authValue: AuthContextType = {
      userId: authUser.clerkId,
      isLoaded: true,
      isSignedIn: true,
      signOut: vi.fn().mockResolvedValue(undefined) as unknown as AuthContextType["signOut"],
      getToken: vi.fn().mockResolvedValue("jwt-mock") as unknown as AuthContextType["getToken"]
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <ImageKitProvider urlEndpoint="https://ik.imagekit.io/y1lpjbueh/">
            <TooltipProvider>
              <MemoryRouter>{ui}</MemoryRouter>
            </TooltipProvider>
          </ImageKitProvider>
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    useCurrentUser.setState({ user: authorUser, loadingUser: false });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    queryClient.clear();
    useCurrentUser.setState({ user: null, loadingUser: false });
  });

  it("permite al autor editar su comentario validando cambios y enviando PUT /api/comments/:id", async () => {
    const user = userEvent.setup();
    let capturedContent: string | undefined;
    let capturedCommentId: string | undefined;

    const ownComment = buildMockComment({
      _id: "comm_edit_1",
      user: authorUser,
      post: { _id: "post_1", userId: authorUser._id },
      content: "Comentario original",
      changeLog: []
    });

    server.use(
      http.put("/api/comments/:commentId", async ({ params, request }) => {
        capturedCommentId = params.commentId as string;
        const body = (await request.json()) as { content: string };
        capturedContent = body.content;
        return HttpResponse.json({
          data: { ...ownComment, content: body.content }
        });
      })
    );

    renderWithProviders(<CommentItem commentData={ownComment} />, authorUser);

    expect(screen.getByText("Comentario original")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Opciones del comentario" }));
    await user.click(await screen.findByRole("menuitem", { name: "Editar" }));

    const saveBtn = screen.getByRole("button", { name: "Guardar cambios" });
    expect(saveBtn).toBeDisabled();

    const editInput = screen.getByRole("textbox");
    await user.clear(editInput);
    await user.type(editInput, "Comentario editado");
    expect(saveBtn).toBeEnabled();

    await user.click(saveBtn);

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Guardar cambios" })
      ).not.toBeInTheDocument();
    });

    expect(capturedCommentId).toBe("comm_edit_1");
    expect(capturedContent).toBe("Comentario editado");
  });

  it("elimina un comentario propio tras confirmar en ConfirmationModal y oculta Editar/Eliminar a terceros", async () => {
    const user = userEvent.setup();
    let deleteCalls = 0;
    let deletedId: string | undefined;

    const comment = buildMockComment({
      _id: "comm_del_1",
      user: authorUser,
      post: { _id: "post_1", userId: authorUser._id },
      content: "Comentario para borrar",
      changeLog: []
    });

    server.use(
      http.delete("/api/comments/:commentId", ({ params }) => {
        deleteCalls += 1;
        deletedId = params.commentId as string;
        return HttpResponse.json({ message: "Eliminado" });
      })
    );

    // 1. Tercero (no autor del comentario ni dueño del post) no ve Editar ni Eliminar
    const thirdRender = renderWithProviders(
      <CommentItem commentData={comment} />,
      otherUser
    );

    await user.click(screen.getByRole("button", { name: "Opciones del comentario" }));
    expect(screen.queryByRole("menuitem", { name: "Editar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Eliminar" })).not.toBeInTheDocument();
    thirdRender.unmount();

    // 2. Autor abre ConfirmationModal y confirma borrado
    renderWithProviders(<CommentItem commentData={comment} />, authorUser);

    await user.click(screen.getByRole("button", { name: "Opciones del comentario" }));
    await user.click(await screen.findByRole("menuitem", { name: "Eliminar" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Eliminar comentario" })
    ).toBeInTheDocument();
    expect(deleteCalls).toBe(0);

    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(deleteCalls).toBe(1);
    expect(deletedId).toBe("comm_del_1");
  });

  it("muestra 'Editado' y abre EditHistoryModal solo cuando el comentario tiene changeLog", async () => {
    const user = userEvent.setup();

    // Sin historial: no muestra "Editado"
    const plainComment = buildMockComment({
      _id: "comm_plain",
      user: authorUser,
      content: "Sin historial",
      changeLog: []
    });

    const first = renderWithProviders(<CommentItem commentData={plainComment} />);
    expect(screen.queryByRole("button", { name: "Editado" })).not.toBeInTheDocument();
    first.unmount();

    // Con historial: muestra "Editado" y abre EditHistoryModal con versiones anteriores
    const editedComment = buildMockComment({
      _id: "comm_hist",
      user: authorUser,
      content: "Versión actual del comentario",
      changeLog: [
        {
          _id: "cl_1",
          previousContent: "Versión anterior del comentario",
          editedAt: "2026-11-22T14:00:00.000Z"
        }
      ]
    });

    renderWithProviders(<CommentItem commentData={editedComment} />);

    await user.click(screen.getByRole("button", { name: "Editado" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Historial de cambios" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Versión anterior del comentario")
    ).toBeInTheDocument();
  });

  it("despliega respuestas anidadas al abrir openReplies, pagina con 'Ver más respuestas' y envía nueva respuesta con parentId", async () => {
    const user = userEvent.setup();
    const requestedReplyPages: string[] = [];
    let sentReplyContent: string | null = null;
    let sentParentId: string | null = null;

    const parentComment = buildMockComment({
      _id: "comm_parent_1",
      user: authorUser,
      post: { _id: "post_replies_1", userId: authorUser._id },
      parent: null,
      content: "Comentario padre",
      repliesCount: 2,
      changeLog: []
    });

    server.use(
      http.get("/api/comments/replies/comment/:commentId", ({ params, request }) => {
        expect(params.commentId).toBe("comm_parent_1");
        const page = new URL(request.url).searchParams.get("page") ?? "1";
        requestedReplyPages.push(page);

        return page === "1"
          ? HttpResponse.json({
              data: [
                buildMockComment({
                  _id: "rep_1",
                  parent: parentComment,
                  content: "Respuesta página 1"
                })
              ],
              hasMore: true,
              nextPage: 2
            })
          : HttpResponse.json({
              data: [
                buildMockComment({
                  _id: "rep_2",
                  parent: parentComment,
                  content: "Respuesta página 2"
                })
              ],
              hasMore: false,
              nextPage: null
            });
      }),
      http.post("/api/comments/posts/:postId", async ({ params, request }) => {
        expect(params.postId).toBe("post_replies_1");
        const formData = await request.formData();
        sentReplyContent = formData.get("content")?.toString() ?? null;
        sentParentId = formData.get("parentId")?.toString() ?? null;

        return HttpResponse.json({
          data: buildMockComment({
            _id: "rep_new",
            parent: parentComment,
            content: sentReplyContent ?? ""
          })
        });
      })
    );

    renderWithProviders(<CommentItem commentData={parentComment} />, authorUser);

    // Dejar correr el ciclo de eventos para detectar un fetch ansioso antes de abrir respuestas
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(requestedReplyPages).toEqual([]);

    await user.click(screen.getByRole("button", { name: /Ver 2 respuestas/i }));

    expect(await screen.findByText("Respuesta página 1")).toBeInTheDocument();
    expect(screen.queryByText("Respuesta página 2")).not.toBeInTheDocument();
    expect(requestedReplyPages).toEqual(["1"]);

    // Paginar respuestas
    await user.click(screen.getByRole("button", { name: /Ver m.*s respuestas/i }));

    expect(await screen.findByText("Respuesta página 2")).toBeInTheDocument();
    expect(requestedReplyPages).toEqual(["1", "2"]);

    // Enviar nueva respuesta anidada con parentId
    const replyInput = screen.getByPlaceholderText("Escribe una respuesta...");
    await user.type(replyInput, "Mi respuesta anidada");

    await user.click(
      screen.getByRole("button", { name: `Responder a ${authorUser.fullName}` })
    );

    await waitFor(() => {
      expect(replyInput).toHaveValue("");
    });
    expect(sentReplyContent).toBe("Mi respuesta anidada");
    expect(sentParentId).toBe("comm_parent_1");

    // Cancelar cierra el panel de respuestas
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(
      screen.queryByPlaceholderText("Escribe una respuesta...")
    ).not.toBeInTheDocument();
  });
});
