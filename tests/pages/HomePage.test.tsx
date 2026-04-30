import { type ReactNode } from "react";
import { act, render, screen, waitFor, waitForElementToBeRemoved } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mockIntersectionObserver } from "jsdom-testing-mocks";
import HomePage from "@/pages/HomePage";
import Providers from "../Providers";
import { mockPostsDb } from "../mocks/posts/postsRepository";

vi.mock("@clerk/clerk-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clerk/clerk-react")>();
  
  return {
    ...actual,
    ClerkProvider: ({ children }: { children: ReactNode }) => {
      return (
        <>
          {children}
        </>
      )
    },
    useUser: vi.fn().mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: {
        id: "user_2026_test",
        fullName: "John Doe",
      },
    }),
    useAuth: vi.fn().mockReturnValue({
      isLoaded: true,
      userId: "user_2026_test",
      sessionId: "sess_123",
      getToken: vi.fn().mockResolvedValue("fake-token"),
      signOut: vi.fn(),
    }),
  };
});

describe.only("HomePage", () => {
  const user = userEvent.setup();
  const io = mockIntersectionObserver();

  beforeEach(() => {
    mockPostsDb.clear();
  });

  it("debe renderizar el feed del home y paginar los posts con infinite scroll", async () => {
    // Agregar 20 posts a la base de datos mock
    mockPostsDb.seed(20);

    render(<HomePage />, {wrapper: Providers});

    // Esperar a que todos los skeletons hayan sido removidos del dom
    await waitForElementToBeRemoved(() => screen.queryAllByTestId(/post-skeleton/));

    const posts = await screen.findAllByTestId(/post-card/i);

    expect(posts).toHaveLength(10);

    const paginationTrigger = screen.getByTestId("pagination-trigger");

    // Simular que se scrolleó hasta el fondo de la página
    // para consultar la siguiente página de posts
    act(() => {
      io.enterNode(paginationTrigger);
    });

    // Esperar a que se haya cargado la siguiente página de posts
    await waitFor(() => {
      const posts = screen.getAllByTestId(/post-card/i);
      expect(posts).toHaveLength(20);
    })
  });
});