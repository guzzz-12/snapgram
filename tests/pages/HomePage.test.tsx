import { type ReactNode } from "react";
import { act, fireEvent, render, screen, waitFor, waitForElementToBeRemoved } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mockIntersectionObserver } from "jsdom-testing-mocks";
import HomePage from "@/pages/HomePage";
import { useGetFollowingCount } from "@/services/profile";
import * as searchModule from "@/services/search";
import Providers from "../Providers";
import { mockPostsDb } from "../mocks/posts/postsRepository";

// Mockear parcialmente el hook useGetFollowingCount
vi.mock("@/services/profile", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/profile")>();
  
  return {
    ...actual,
    useGetFollowingCount: vi.fn(),
  }
});

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

    // Simular que el usuario está siguiendo a 10 usuarios
    (useGetFollowingCount as any).mockReturnValue({
      followingCount: 10,
      loadingFollowingCount: false,
    });

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


  it("debe mostrar la pantalla de nuevo usuario y hacer focus automáticamente al input de búsqueda de usuarios", async () => {
    // Simular que el usuario no está siguiendo a nadie
    (useGetFollowingCount as any).mockReturnValue({
      followingCount: 0,
      loadingFollowingCount: false,
    });

    render(<HomePage />, {wrapper: Providers});

    // Esperar a que todos los skeletons hayan sido removidos del dom
    await waitForElementToBeRemoved(() => screen.queryAllByTestId(/post-skeleton/));

    // Pantalla de nuevo usuario
    const newUserScreen = screen.queryByTestId("new-user-screen");
    expect(newUserScreen).toBeInTheDocument();

    expect(screen.queryByText(/comienza a seguir cuentas/i)).toBeInTheDocument();

    // Input de búsqueda de usuarios
    const searchInput = screen.queryByTestId("search-users-input");
    expect(searchInput).toBeInTheDocument();

    // Verificar que se haga focus automáticamente en el input de búsqueda
    expect(searchInput).toHaveFocus();
  });


  it("debe mostrar pantalla de 'no hay publicaciones disponibles'", async () => {
    // Simular que el usuario está siguiendo a 10 usuarios
    (useGetFollowingCount as any).mockReturnValue({
      followingCount: 10,
      loadingFollowingCount: false,
    });

    render(<HomePage />, {wrapper: Providers});

    // Esperar a que todos los skeletons hayan sido removidos del dom
    await waitForElementToBeRemoved(() => screen.queryAllByTestId(/post-skeleton/));

    // Verificar si se renderizó la pantalla de no publicaciones
    const heading = screen.queryByRole("heading", {level: 1});
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent(/no hay publicaciones/i);
  });


  it("debe ejecutar la búsqueda sólo una vez luego de que el usuario deja de tipear", async () => {
    // Simular que el usuario no está siguiendo a nadie
    (useGetFollowingCount as any).mockReturnValue({
      followingCount: 0,
      loadingFollowingCount: false,
    });

    render(<HomePage />, {wrapper: Providers});

    // Esperar a que todos los skeletons hayan sido removidos del dom
    await waitForElementToBeRemoved(() => screen.queryAllByTestId(/post-skeleton/));

    vi.useFakeTimers();

    const searchSpy = vi.spyOn(searchModule, "useSearchUsers");

    // Input de búsqueda de usuarios
    const searchInput = screen.queryByTestId("search-users-input");
    expect(searchInput).toBeInTheDocument();

    // Simular que el usuario escribe en el input
    fireEvent.change(searchInput!, { target: { value: "john" } });

    // Esperar a que termine el debounce
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Verificar que la función de búsqueda se haya ejecutado una sola vez
    expect(searchSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({searchTerm: "john", searchType: "people"}),
    );

    vi.useRealTimers();
  });
});