import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, type InitialEntry } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ImageKitProvider } from "@imagekit/react";
import { mockIntersectionObserver } from "jsdom-testing-mocks";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import PostPage from "@/pages/PostPage";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthContext, type AuthContext as AuthContextType } from "@/providers/AuthProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { server } from "../mocks/server";
import { buildMockUser } from "../mocks/users/factories";
import { buildMockPost, buildMockPostWithLikes } from "../mocks/posts/factories";
import { buildMockComment } from "../mocks/comments/factories";

/**
 * Suite de integración para la página de detalle de publicación (`src/pages/PostPage.tsx`).
 *
 * Propósito:
 *   Validar el renderizado condicional por tipo de publicación (`text`, `repost`, `image`,
 *   `textWithImage`), la carga diferida y paginación infinita de comentarios, el flujo
 *   completo de edición in-place, el manejo de publicaciones inexistentes o errores de red
 *   y la navegación de cierre (`navigate(-1)`).
 *
 * Qué evalúa y alcance (SUT):
 *   - Guarda de parámetro `:postId`: redirige a `/` si no existe `postId` en la ruta.
 *   - Carga inicial: muestra el skeleton de dos columnas mientras `GET /api/posts/:postId` está
 *     pendiente y mantiene bloqueada la consulta de comentarios (`enabled: !!postData`).
 *   - Layouts por `postType`:
 *     - `"text"`: columna única centrada sin carrusel `Slider` ni `SharedPostCard`.
 *     - `"repost"`: columna única centrada incluyendo `SharedPostCard` con el post original.
 *     - `"image"` / `"textWithImage"`: layout dividido en dos columnas con carrusel `Slider`
 *       (`.postPageSlider`) e imágenes renderizadas + panel derecho de detalles y comentarios.
 *   - Paginación de comentarios: solicita `page=1` tras cargar el post y dispara `fetchNextPage`
 *     (`page=2`) cuando `paginationRef` entra en el viewport vía `IntersectionObserver`.
 *   - Edición in-place: al abrir `"Opciones del post"` → `"Editar"`, precarga `postData.content`
 *     en `EditPostForm`, permite cancelar sin llamar a la API y permite guardar cambios vía
 *     `PUT /api/posts/:postId`.
 *   - Estados de error y navegación: `<PostNotFound />` ante `data: null` o fallo de API
 *     (con `toast.error`), `toast.error` si falla `useGetPostComments` y `navigate(-1)` al
 *     pulsar `"Salir de la publicación"`.
 */
describe("PostPage", () => {
  let queryClient: QueryClient;
  let io: ReturnType<typeof mockIntersectionObserver>;

  const AUTHOR_CLERK_ID = "clerk_author_1";

  type RenderOptions = {
    initialEntries?: InitialEntry[];
    initialIndex?: number;
    authUserId?: string | null;
  };

  const renderPostPage = ({
    initialEntries = ["/post/post_1"],
    initialIndex,
    authUserId = AUTHOR_CLERK_ID
  }: RenderOptions = {}) => {
    const authValue: AuthContextType = {
      userId: authUserId,
      isLoaded: true,
      isSignedIn: Boolean(authUserId),
      signOut: vi.fn().mockResolvedValue(undefined) as unknown as AuthContextType["signOut"],
      getToken: vi.fn().mockResolvedValue("jwt-mock") as unknown as AuthContextType["getToken"]
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <ImageKitProvider urlEndpoint="https://ik.imagekit.io/y1lpjbueh/">
            <TooltipProvider>
              <MemoryRouter
                initialEntries={initialEntries}
                initialIndex={initialIndex}
              >
                <Routes>
                  <Route path="/" element={<div data-testid="home-route">Home</div>} />
                  <Route
                    path="/previous-feed"
                    element={<div data-testid="previous-route">Feed Anterior</div>}
                  />
                  <Route path="/post-empty" element={<PostPage />} />
                  <Route path="/post/:postId" element={<PostPage />} />
                </Routes>
              </MemoryRouter>
            </TooltipProvider>
          </ImageKitProvider>
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    io = mockIntersectionObserver();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, retryDelay: 0 },
        mutations: { retry: false }
      }
    });

    useCurrentUser.setState({
      user: buildMockUser({ _id: "usr_author_1", clerkId: AUTHOR_CLERK_ID }),
      loadingUser: false
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    queryClient.clear();
    useCurrentUser.setState({ user: null, loadingUser: false });
  });

  describe("guarda de ruta y carga inicial", () => {
    it("redirige a / cuando la ruta no incluye el parámetro postId", async () => {
      let postRequests = 0;
      let commentRequests = 0;

      server.use(
        http.get("/api/posts/:postId", () => {
          postRequests += 1;
          return HttpResponse.json({ data: buildMockPostWithLikes() });
        }),
        http.get("/api/comments/posts/:postId", () => {
          commentRequests += 1;
          return HttpResponse.json({ data: [], hasMore: false, nextPage: null });
        })
      );

      renderPostPage({ initialEntries: ["/post-empty"] });

      expect(await screen.findByTestId("home-route")).toBeInTheDocument();
      expect(postRequests).toBe(0);
      expect(commentRequests).toBe(0);
    });

    it("muestra el skeleton mientras carga el post y bloquea useGetPostComments hasta que postData exista", async () => {
      let releasePost!: () => void;
      const postGate = new Promise<void>((resolve) => {
        releasePost = resolve;
      });
      let commentRequests = 0;

      const textPost = buildMockPostWithLikes({
        _id: "post_loading_1",
        postType: "text",
        content: "Publicación cargada tras skeleton",
        imageUrls: []
      });

      server.use(
        http.get("/api/posts/:postId", async () => {
          await postGate;
          return HttpResponse.json({ data: textPost });
        }),
        http.get("/api/comments/posts/:postId", () => {
          commentRequests += 1;
          return HttpResponse.json({ data: [], hasMore: false, nextPage: null });
        })
      );

      renderPostPage({ initialEntries: ["/post/post_loading_1"] });

      await waitFor(() => {
        expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
      });
      expect(screen.queryByRole("main")).not.toBeInTheDocument();
      expect(commentRequests).toBe(0);

      act(() => {
        releasePost();
      });

      expect(
        await screen.findByText("Publicación cargada tras skeleton")
      ).toBeInTheDocument();
      await waitFor(() => {
        expect(commentRequests).toBe(1);
      });
    });
  });

  describe("renderizado condicional por postType", () => {
    it("renderiza el layout centrado de una columna sin Slider para postType='text'", async () => {
      const textPost = buildMockPostWithLikes({
        _id: "post_text_1",
        postType: "text",
        content: "Reflexión solo de texto",
        imageUrls: [],
        user: {
          _id: "usr_author_1",
          clerkId: AUTHOR_CLERK_ID,
          fullName: "Elena Texto",
          username: "elena_t",
          profilePicture: "https://example.com/elena.png"
        }
      });

      server.use(
        http.get("/api/posts/:postId", () => HttpResponse.json({ data: textPost }))
      );

      const { container } = renderPostPage({ initialEntries: ["/post/post_text_1"] });

      expect(await screen.findByText("Reflexión solo de texto")).toBeInTheDocument();
      expect(screen.getByText("Elena Texto")).toBeInTheDocument();
      expect(await screen.findByText("Todavía no hay comentarios")).toBeInTheDocument();

      // Columna única centrada y sin carrusel de imágenes
      expect(container.querySelector("section.max-w-\\[700px\\]")).toBeInTheDocument();
      expect(container.querySelector(".postPageSlider")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Seleccionar imagen" })).toBeInTheDocument();
    });

    it("renderiza el layout centrado con SharedPostCard y sin Slider para postType='repost'", async () => {
      const originalAuthor = buildMockUser({
        fullName: "Mateo Original",
        username: "mateo_orig"
      });
      const originalPost = buildMockPost({
        _id: "post_orig_99",
        user: originalAuthor,
        content: "Contenido original reposteado",
        imageUrls: [],
        postType: "text"
      });
      const repost = buildMockPostWithLikes({
        _id: "post_repost_1",
        postType: "repost",
        content: "Comentario sobre el repost",
        imageUrls: [],
        originalPost
      });

      server.use(
        http.get("/api/posts/:postId", () => HttpResponse.json({ data: repost }))
      );

      const { container } = renderPostPage({ initialEntries: ["/post/post_repost_1"] });

      expect(await screen.findByText("Comentario sobre el repost")).toBeInTheDocument();
      expect(screen.getByText("Mateo Original")).toBeInTheDocument();
      expect(screen.getByText("Contenido original reposteado")).toBeInTheDocument();

      expect(container.querySelector("section.max-w-\\[700px\\]")).toBeInTheDocument();
      expect(container.querySelector(".postPageSlider")).not.toBeInTheDocument();
    });

    it.each([
      {
        postType: "image" as const,
        content: "",
        images: ["https://example.com/foto-1.jpg", "https://example.com/foto-2.jpg"]
      },
      {
        postType: "textWithImage" as const,
        content: "Descripción junto a la foto",
        images: ["https://example.com/paisaje.jpg"]
      }
    ])(
      "renderiza el layout dividido a dos columnas con carrusel Slider para postType='$postType'",
      async ({ postType, content, images }) => {
        const mediaPost = buildMockPostWithLikes({
          _id: `post_${postType}`,
          postType,
          content,
          imageUrls: images,
          user: {
            _id: "usr_author_1",
            clerkId: AUTHOR_CLERK_ID,
            fullName: "Sofía Foto",
            username: "sofia_f",
            profilePicture: "https://example.com/sofia.png"
          }
        });

        server.use(
          http.get("/api/posts/:postId", () => HttpResponse.json({ data: mediaPost }))
        );

        const { container } = renderPostPage({
          initialEntries: [`/post/post_${postType}`]
        });

        expect(await screen.findByText("Sofía Foto")).toBeInTheDocument();
        expect(container.querySelector(".postPageSlider")).toBeInTheDocument();
        expect(container.querySelector("section.max-w-\\[700px\\]")).not.toBeInTheDocument();

        const renderedImages = screen.getAllByAltText("Post de Sofía Foto");
        expect(renderedImages).toHaveLength(images.length);
        images.forEach((url, index) => {
          expect(renderedImages[index]).toHaveAttribute("src", url);
        });

        if (content) {
          expect(screen.getByText(content)).toBeInTheDocument();
        }
      }
    );
  });

  describe("paginación infinita de comentarios", () => {
    it("carga la primera página de comentarios y solicita la página 2 al intersectar paginationRef", async () => {
      const mediaPost = buildMockPostWithLikes({
        _id: "post_paginated_1",
        postType: "textWithImage",
        content: "Post con muchos comentarios",
        imageUrls: ["https://example.com/img.jpg"]
      });

      const requestedPages: string[] = [];

      server.use(
        http.get("/api/posts/:postId", () => HttpResponse.json({ data: mediaPost })),
        http.get("/api/comments/posts/:postId", ({ params, request }) => {
          expect(params.postId).toBe("post_paginated_1");
          const page = new URL(request.url).searchParams.get("page") ?? "1";
          requestedPages.push(page);

          return page === "1"
            ? HttpResponse.json({
                data: [buildMockComment({ _id: "c_1", content: "Comentario página uno" })],
                hasMore: true,
                nextPage: 2
              })
            : HttpResponse.json({
                data: [buildMockComment({ _id: "c_2", content: "Comentario página dos" })],
                hasMore: false,
                nextPage: null
              });
        })
      );

      const { container } = renderPostPage({
        initialEntries: ["/post/post_paginated_1"]
      });

      expect(await screen.findByText("Comentario página uno")).toBeInTheDocument();
      expect(screen.queryByText("Comentario página dos")).not.toBeInTheDocument();
      expect(requestedPages).toEqual(["1"]);

      const sentinel = await waitFor(() => {
        const el = container.querySelector("div.w-full.h-4");
        expect(el).not.toBeNull();
        return el as HTMLDivElement;
      });

      act(() => {
        io.enterNode(sentinel);
      });

      expect(await screen.findByText("Comentario página dos")).toBeInTheDocument();
      expect(screen.getByText("Comentario página uno")).toBeInTheDocument();
      expect(requestedPages).toEqual(["1", "2"]);
    });
  });

  describe("modo edición de publicación", () => {
    it("precarga postData.content en EditPostForm, cancela sin enviar PUT y guarda cambios actualizando el contenido", async () => {
      const user = userEvent.setup();

      let currentPost = buildMockPostWithLikes({
        _id: "post_edit_1",
        postType: "text",
        content: "Texto original del post",
        imageUrls: [],
        user: {
          _id: "usr_author_1",
          clerkId: AUTHOR_CLERK_ID,
          fullName: "Autor Dueño",
          username: "autor_d",
          profilePicture: "https://example.com/autor.png"
        }
      });

      let putCalls = 0;
      let capturedPutBody: { content?: string } | null = null;

      server.use(
        http.get("/api/posts/:postId", () => HttpResponse.json({ data: currentPost })),
        http.put("/api/posts/:postId", async ({ request }) => {
          putCalls += 1;
          capturedPutBody = (await request.json()) as { content?: string };
          currentPost = {
            ...currentPost,
            content: capturedPutBody.content ?? currentPost.content
          };
          return HttpResponse.json({ data: currentPost });
        })
      );

      renderPostPage({ initialEntries: ["/post/post_edit_1"] });

      expect(await screen.findByText("Texto original del post")).toBeInTheDocument();

      // Abrir menú de opciones y entrar en modo edición
      await user.click(screen.getByRole("button", { name: "Opciones del post" }));
      await user.click(await screen.findByRole("menuitem", { name: "Editar" }));

      const editTextarea = await screen.findByTestId("create-post-input");
      expect(editTextarea).toHaveValue("Texto original del post");
      expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();

      // Cancelar debe salir del modo edición sin disparar PUT
      await user.click(screen.getByRole("button", { name: "Cancelar" }));
      expect(screen.queryByTestId("create-post-input")).not.toBeInTheDocument();
      expect(screen.getByText("Texto original del post")).toBeInTheDocument();
      expect(putCalls).toBe(0);

      // Volver a abrir edición, modificar contenido y guardar
      await user.click(screen.getByRole("button", { name: "Opciones del post" }));
      await user.click(await screen.findByRole("menuitem", { name: "Editar" }));

      const textarea = await screen.findByTestId("create-post-input");
      expect(textarea).toHaveValue("Texto original del post");

      await user.clear(textarea);
      await user.type(textarea, "Texto actualizado con éxito");

      const saveBtn = screen.getByRole("button", { name: "Guardar cambios" });
      expect(saveBtn).toBeEnabled();
      await user.click(saveBtn);

      await waitFor(() => {
        expect(screen.queryByTestId("create-post-input")).not.toBeInTheDocument();
      });

      expect(putCalls).toBe(1);
      expect(capturedPutBody).toEqual({ content: "Texto actualizado con éxito" });
      expect(await screen.findByText("Texto actualizado con éxito")).toBeInTheDocument();
    });
  });

  describe("post inexistente, errores de API y navegación de cierre", () => {
    it("renderiza PostNotFound sin toast ni consulta de comentarios cuando la API devuelve data: null", async () => {
      const user = userEvent.setup();
      let commentRequests = 0;

      server.use(
        http.get("/api/posts/:postId", () => HttpResponse.json({ data: null })),
        http.get("/api/comments/posts/:postId", () => {
          commentRequests += 1;
          return HttpResponse.json({ data: [], hasMore: false, nextPage: null });
        })
      );

      const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "toast-id");

      renderPostPage({ initialEntries: ["/post/post_null"] });

      expect(
        await screen.findByRole("heading", { name: "Este contenido no está disponible" })
      ).toBeInTheDocument();
      expect(toastErrorSpy).not.toHaveBeenCalled();
      expect(commentRequests).toBe(0);

      await user.click(screen.getByRole("button", { name: "Volver" }));
      expect(await screen.findByTestId("home-route")).toBeInTheDocument();
    });

    it("muestra toast.error y renderiza PostNotFound si falla la petición del post", async () => {
      let commentRequests = 0;

      server.use(
        http.get("/api/posts/:postId", () =>
          HttpResponse.json(
            { message: "Fallo al cargar la publicación" },
            { status: 500 }
          )
        ),
        http.get("/api/comments/posts/:postId", () => {
          commentRequests += 1;
          return HttpResponse.json({ data: [], hasMore: false, nextPage: null });
        })
      );

      const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "toast-id");

      renderPostPage({ initialEntries: ["/post/post_error_500"] });

      expect(
        await screen.findByRole("heading", { name: "Este contenido no está disponible" })
      ).toBeInTheDocument();
      expect(toastErrorSpy).toHaveBeenCalledWith("Fallo al cargar la publicación");
      expect(commentRequests).toBe(0);
    });

    it("muestra toast.error si falla la carga de comentarios manteniendo visible el post", async () => {
      const textPost = buildMockPostWithLikes({
        _id: "post_comments_err",
        postType: "text",
        content: "Post visible aunque fallen comentarios",
        imageUrls: []
      });

      server.use(
        http.get("/api/posts/:postId", () => HttpResponse.json({ data: textPost })),
        http.get("/api/comments/posts/:postId", () =>
          HttpResponse.json(
            { message: "Error al cargar comentarios" },
            { status: 500 }
          )
        )
      );

      const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "toast-id");

      renderPostPage({ initialEntries: ["/post/post_comments_err"] });

      expect(
        await screen.findByText("Post visible aunque fallen comentarios")
      ).toBeInTheDocument();
      await waitFor(() => {
        expect(toastErrorSpy).toHaveBeenCalledWith("Error al cargar comentarios");
      });
    });

    it("navega hacia atrás (navigate(-1)) al pulsar el botón 'Salir de la publicación'", async () => {
      const user = userEvent.setup();

      const textPost = buildMockPostWithLikes({
        _id: "post_back_1",
        postType: "text",
        content: "Publicación para cerrar",
        imageUrls: []
      });

      server.use(
        http.get("/api/posts/:postId", () => HttpResponse.json({ data: textPost }))
      );

      renderPostPage({
        initialEntries: ["/previous-feed", "/post/post_back_1"],
        initialIndex: 1
      });

      expect(await screen.findByText("Publicación para cerrar")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Salir de la publicación" }));

      expect(await screen.findByTestId("previous-route")).toBeInTheDocument();
      expect(screen.queryByTestId("home-route")).not.toBeInTheDocument();
    });
  });
});
