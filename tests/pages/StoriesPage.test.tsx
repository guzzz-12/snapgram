import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, type InitialEntry } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import StoriesPage from "@/pages/StoriesPage";
import { AuthContext, type AuthContext as AuthContextType } from "@/providers/AuthProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { server } from "../mocks/server";
import { buildMockUser } from "../mocks/users/factories";
import {
  buildMockStory,
  buildMockUserWithStories
} from "../mocks/stories/factories";

/**
 * Suite de integración para la página de historias (`src/pages/StoriesPage.tsx`).
 *
 * Propósito:
 *   Validar la hidratación del visor de historias a partir del parámetro de ruta `:username`,
 *   el cierre mediante el botón `"Volver al inicio"` y la tecla `Escape`, y la limpieza del
 *   listener global de teclado al desmontar.
 *
 * Qué evalúa y alcance (SUT):
 *   - Pasa `:username` a `<StoriesViewer storiesUsername={username} />` hidratando desde
 *     `GET /api/stories/:username`.
 *   - Navega a `"/"` al hacer clic en `"Volver al inicio"` y al presionar la tecla `Escape`.
 *   - Ignora otras teclas y limpia el listener `keydown` de `document` al desmontar.
 */
describe("StoriesPage", () => {
  let queryClient: QueryClient;

  const renderStoriesPage = (initialEntries: InitialEntry[]) => {
    const authValue: AuthContextType = {
      userId: "clerk_user_1",
      isLoaded: true,
      isSignedIn: true,
      signOut: vi.fn().mockResolvedValue(undefined) as unknown as AuthContextType["signOut"],
      getToken: vi.fn().mockResolvedValue("jwt-mock") as unknown as AuthContextType["getToken"]
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <MemoryRouter initialEntries={initialEntries}>
            <Routes>
              <Route path="/" element={<div data-testid="home-route">Home</div>} />
              <Route path="/stories/:username" element={<StoriesPage />} />
            </Routes>
          </MemoryRouter>
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

    useCurrentUser.setState({
      user: buildMockUser({
        _id: "usr_me_1",
        clerkId: "clerk_user_1",
        hasCryptoKeys: true
      }),
      loadingUser: false
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    queryClient.clear();
    useCurrentUser.setState({ user: null, loadingUser: false });
  });

  it("renderiza StoriesViewer con el :username de la ruta y navega a '/' al pulsar 'Volver al inicio'", async () => {
    const user = userEvent.setup();
    let capturedUsername: string | undefined;

    const storyAuthor = buildMockUser({
      _id: "usr_me_1",
      clerkId: "clerk_user_1",
      username: "lucia_stories",
      fullName: "Lucía Historias"
    });
    const mockStories = buildMockUserWithStories({
      _id: storyAuthor._id,
      clerkId: storyAuthor.clerkId,
      username: "lucia_stories",
      fullName: "Lucía Historias",
      stories: [
        buildMockStory({
          _id: "st_lucia_1",
          user: storyAuthor,
          mediaType: "text",
          content: "Mi historia de prueba"
        })
      ]
    });

    server.use(
      http.get("/api/stories/:username", ({ params }) => {
        capturedUsername = params.username as string;
        return HttpResponse.json({ data: mockStories });
      })
    );

    renderStoriesPage(["/stories/lucia_stories"]);

    expect(await screen.findByText("Mi historia de prueba")).toBeInTheDocument();
    expect(capturedUsername).toBe("lucia_stories");

    await user.click(screen.getByRole("button", { name: "Volver al inicio" }));

    expect(await screen.findByTestId("home-route")).toBeInTheDocument();
    expect(screen.queryByText("Mi historia de prueba")).not.toBeInTheDocument();
  });

  it("navega a '/' al presionar Escape, ignora otras teclas y limpia el listener al desmontar", async () => {
    const storyAuthor = buildMockUser({
      _id: "usr_me_1",
      clerkId: "clerk_user_1",
      username: "mario_stories"
    });

    server.use(
      http.get("/api/stories/:username", () =>
        HttpResponse.json({
          data: buildMockUserWithStories({
            _id: storyAuthor._id,
            clerkId: storyAuthor.clerkId,
            username: "mario_stories",
            stories: [
              buildMockStory({
                _id: "st_mario_1",
                user: storyAuthor,
                mediaType: "text",
                content: "Historia de Mario"
              })
            ]
          })
        })
      )
    );

    const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

    renderStoriesPage(["/stories/mario_stories"]);

    expect(await screen.findByText("Historia de Mario")).toBeInTheDocument();

    // Otras teclas no deben cerrar el visor
    fireEvent.keyDown(document, { key: "Enter" });
    fireEvent.keyDown(document, { key: "a" });
    expect(screen.getByText("Historia de Mario")).toBeInTheDocument();
    expect(screen.queryByTestId("home-route")).not.toBeInTheDocument();

    // Escape sí debe navegar a "/" y desmontar limpiando el listener
    fireEvent.keyDown(document, { key: "Escape" });

    expect(await screen.findByTestId("home-route")).toBeInTheDocument();
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function)
    );
  });
});
