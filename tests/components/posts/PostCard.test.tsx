import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { ImageKitProvider } from "@imagekit/react";
import { mockIntersectionObserver } from "jsdom-testing-mocks";
import { http, HttpResponse } from "msw";
import PostCard from "@/components/posts/PostCard";
import PostCardFooter from "@/components/posts/PostCardFooter";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthContext, type AuthContext as AuthContextType } from "@/providers/AuthProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCreatePublicationModal } from "@/hooks/useCreatePublicationModal";
import type { PostWithLikes } from "@/types/global";
import { server } from "../../mocks/server";
import { buildMockUser } from "../../mocks/users/factories";
import { buildMockPost, buildMockPostWithLikes } from "../../mocks/posts/factories";

/**
 * Suite de integración para tarjetas de publicación y sus interacciones de pie
 * (`src/components/posts/PostCard.tsx` y `src/components/posts/PostCardFooter.tsx`).
 *
 * Propósito:
 *   Validar la edición inline de publicaciones según su tipo (`text`, `image`, `repost`) y
 *   las interacciones del pie de publicación (like optimista, popover de likes, comentar y
 *   apertura del diálogo de compartir/repost).
 *
 * Qué evalúa y alcance (SUTs):
 *   - `PostCard`: edición inline con habilitación condicional de `"Guardar cambios"`
 *     (deshabilitado si el texto no cambia o si está vacío en `postType === "text"`, habilitado
 *     con texto vacío en `postType === "image"`), cancelación sin mutación, invocación de
 *     `editPost` con cierre en `onSuccess`, y renderizado de `SharedPostCard` en reposts.
 *   - `PostCardFooter`: like optimista sobre la caché `["posts"]` + petición debounced a
 *     `POST /api/likes/post/:postId`, `LikesPopover` (botón deshabilitado con `0` likes vs
 *     carga de lista `GET /api/likes/post/:postId`), acción `"Compartir"` en
 *     `useCreatePublicationModal` y respeto de `isModal` en `"Comentar"`.
 */
describe("PostCard y PostCardFooter", () => {
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
    mockIntersectionObserver();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    useCurrentUser.setState({ user: authorUser, loadingUser: false });
    useCreatePublicationModal.setState({
      open: false,
      publicationType: null,
      isRepost: false,
      repostedPostId: null
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    queryClient.clear();
    useCurrentUser.setState({ user: null, loadingUser: false });
    useCreatePublicationModal.setState({
      open: false,
      publicationType: null,
      isRepost: false,
      repostedPostId: null
    });
  });

  describe("PostCard", () => {
    it("deshabilita 'Guardar cambios' si el texto no cambió o está vacío en postType='text', cancela sin mutar y guarda cerrando la edición", async () => {
      const user = userEvent.setup();
      const editPostMock = vi.fn(({ onSuccess }) => {
        onSuccess();
      });

      const textPost = buildMockPostWithLikes({
        _id: "post_card_text_1",
        postType: "text",
        content: "Texto inicial del post",
        imageUrls: [],
        user: {
          _id: authorUser._id,
          clerkId: authorUser.clerkId,
          fullName: authorUser.fullName,
          username: authorUser.username,
          profilePicture: authorUser.profilePicture
        }
      });

      renderWithProviders(
        <PostCard postData={textPost} editPost={editPostMock} isPending={false} />
      );

      expect(screen.getByText("Texto inicial del post")).toBeInTheDocument();

      // Abrir menú y activar modo edición
      await user.click(screen.getByRole("button", { name: "Opciones del post" }));
      await user.click(await screen.findByRole("menuitem", { name: "Editar" }));

      const textarea = screen.getByTestId("create-post-input");
      const saveBtn = screen.getByRole("button", { name: "Guardar cambios" });

      expect(textarea).toHaveValue("Texto inicial del post");
      expect(saveBtn).toBeDisabled();

      // Vaciar texto en un post de tipo "text" debe mantener deshabilitado "Guardar cambios"
      await user.clear(textarea);
      expect(textarea).toHaveValue("");
      expect(saveBtn).toBeDisabled();

      // Modificar a un texto distinto habilita el botón; cancelar cierra sin invocar editPost
      await user.type(textarea, "Cambio temporal");
      expect(saveBtn).toBeEnabled();

      await user.click(screen.getByRole("button", { name: "Cancelar" }));
      expect(screen.queryByTestId("create-post-input")).not.toBeInTheDocument();
      expect(screen.getByText("Texto inicial del post")).toBeInTheDocument();
      expect(editPostMock).not.toHaveBeenCalled();

      // Reabrir edición, cambiar texto y guardar
      await user.click(screen.getByRole("button", { name: "Opciones del post" }));
      await user.click(await screen.findByRole("menuitem", { name: "Editar" }));

      const editInput = screen.getByTestId("create-post-input");
      await user.clear(editInput);
      await user.type(editInput, "Versión guardada");
      await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

      expect(editPostMock).toHaveBeenCalledTimes(1);
      expect(editPostMock).toHaveBeenCalledWith(
        expect.objectContaining({
          postData: textPost,
          updatedTextContent: "Versión guardada",
          searchTerm: null,
          onSuccess: expect.any(Function)
        })
      );
      expect(screen.queryByTestId("create-post-input")).not.toBeInTheDocument();
    });

    it("permite guardar texto vacío en postType='image' y renderiza SharedPostCard en postType='repost'", async () => {
      const user = userEvent.setup();
      const editPostMock = vi.fn();

      const imagePost = buildMockPostWithLikes({
        _id: "post_card_img_1",
        postType: "image",
        content: "Pie de foto",
        imageUrls: ["https://example.com/foto.jpg"],
        user: {
          _id: authorUser._id,
          clerkId: authorUser.clerkId,
          fullName: authorUser.fullName,
          username: authorUser.username,
          profilePicture: authorUser.profilePicture
        }
      });

      const { unmount } = renderWithProviders(
        <PostCard postData={imagePost} editPost={editPostMock} isPending={false} />
      );

      await user.click(screen.getByRole("button", { name: "Opciones del post" }));
      await user.click(await screen.findByRole("menuitem", { name: "Editar" }));

      const textarea = screen.getByTestId("create-post-input");
      await user.clear(textarea);

      // En postType="image", el texto vacío SÍ habilita "Guardar cambios"
      expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeEnabled();
      unmount();

      // Repost renderiza SharedPostCard con el autor y contenido original
      const originalPost = buildMockPost({
        _id: "orig_post_1",
        user: otherUser,
        content: "Contenido original compartido",
        imageUrls: [],
        postType: "text"
      });
      const repost = buildMockPostWithLikes({
        _id: "repost_card_1",
        postType: "repost",
        content: "Miren esto",
        imageUrls: [],
        originalPost
      });

      renderWithProviders(
        <PostCard postData={repost} editPost={vi.fn()} isPending={false} />
      );

      expect(screen.getByText("Miren esto")).toBeInTheDocument();
      expect(screen.getByText("Mateo Lector")).toBeInTheDocument();
      expect(screen.getByText("Contenido original compartido")).toBeInTheDocument();
    });
  });

  describe("PostCardFooter", () => {
    it("aplica like optimista en la caché ['posts'] y envía POST /api/likes/post/:postId", async () => {
      const user = userEvent.setup();
      let likePostRequests = 0;

      const post = buildMockPostWithLikes({
        _id: "post_footer_like_1",
        isLiked: false,
        likesCount: 2,
        commentsCount: 1,
        sharedCount: 0
      });

      queryClient.setQueryData(["posts"], {
        pages: [{ data: [post], hasMore: false, nextPage: null }],
        pageParams: [1]
      });

      server.use(
        http.post("/api/likes/post/:postId", ({ params }) => {
          expect(params.postId).toBe("post_footer_like_1");
          likePostRequests += 1;
          return HttpResponse.json({ data: { postId: params.postId } });
        })
      );

      const LiveFooterHarness = () => {
        const { data } = useQuery<{ pages: { data: PostWithLikes[] }[] }>({
          queryKey: ["posts"],
          queryFn: () => ({ pages: [{ data: [post] }] }),
          enabled: false
        });
        const livePost = data?.pages[0].data[0] ?? post;
        return <PostCardFooter postData={livePost} />;
      };

      renderWithProviders(<LiveFooterHarness />);

      expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Me gusta" }));

      // Actualización optimista inmediata del contador (2 -> 3) y estado isLiked
      expect(await screen.findByRole("button", { name: "3" })).toBeInTheDocument();

      await waitFor(() => {
        expect(likePostRequests).toBe(1);
      });
    });

    it("deshabilita LikesPopover con 0 likes, carga y muestra la lista de usuarios al abrirlo con likes > 0, y gestiona Compartir y Comentar", async () => {
      const user = userEvent.setup();
      let likesListRequests = 0;

      server.use(
        http.get("/api/likes/post/:postId", () => {
          likesListRequests += 1;
          return HttpResponse.json({
            data: [
              {
                _id: "like_1",
                user: {
                  _id: "u_l1",
                  clerkId: "clerk_l1",
                  fullName: "Clara Like",
                  username: "clara_l",
                  profilePicture: "https://example.com/clara.png"
                },
                post: { _id: "post_pop_1" },
                comment: { _id: "" }
              },
              {
                _id: "like_2",
                user: {
                  _id: "u_l2",
                  clerkId: "clerk_l2",
                  fullName: "Diego Like",
                  username: "diego_l",
                  profilePicture: "https://example.com/diego.png"
                },
                post: { _id: "post_pop_1" },
                comment: { _id: "" }
              }
            ],
            hasMore: false,
            nextPage: null
          });
        })
      );

      // 1. Con 0 likes el botón está deshabilitado y no dispara GET /api/likes/post/:postId
      const zeroLikesPost = buildMockPostWithLikes({
        _id: "post_zero_likes",
        likesCount: 0
      });
      const setOpenModalInsideModal = vi.fn();
      const firstRender = renderWithProviders(
        <PostCardFooter
          postData={zeroLikesPost}
          isModal={true}
          setOpenPostModal={setOpenModalInsideModal}
        />
      );

      expect(screen.getByRole("button", { name: "0" })).toBeDisabled();
      expect(likesListRequests).toBe(0);

      // En modo isModal=true, "Comentar" no vuelve a abrir el modal
      await user.click(screen.getByRole("button", { name: "Comentar" }));
      expect(setOpenModalInsideModal).not.toHaveBeenCalled();

      firstRender.unmount();

      // 2. Con likesCount > 0 abre LikesPopover, muestra usuarios, y "Compartir" / "Comentar" funcionan
      const likedPost = buildMockPostWithLikes({
        _id: "post_pop_1",
        likesCount: 2
      });
      const setOpenPostModal = vi.fn();

      renderWithProviders(
        <PostCardFooter
          postData={likedPost}
          isModal={false}
          setOpenPostModal={setOpenPostModal}
        />
      );

      await user.click(screen.getByRole("button", { name: "2" }));

      expect(await screen.findByText("Clara Like")).toBeInTheDocument();
      expect(screen.getByText("Diego Like")).toBeInTheDocument();
      expect(likesListRequests).toBe(1);

      // Cerrar popover o pulsar Compartir (abre diálogo de repost en Zustand)
      await user.click(screen.getByRole("button", { name: "Compartir" }));
      expect(useCreatePublicationModal.getState()).toMatchObject({
        open: true,
        publicationType: "post",
        isRepost: true,
        repostedPostId: "post_pop_1"
      });

      // Comentar fuera de modal invoca setOpenPostModal(true)
      await user.click(screen.getByRole("button", { name: "Comentar" }));
      expect(setOpenPostModal).toHaveBeenCalledWith(true);
    });
  });
});
