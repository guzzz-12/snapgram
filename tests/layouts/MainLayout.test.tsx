import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { mockIntersectionObserver } from "jsdom-testing-mocks";
import Layout from "@/Layout";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { buildMockUser } from "../mocks/users/factories";
import Providers from "../Providers";

// Mockear los hooks de Clerk
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
    useAuth: () => ({
      isLoaded: true,
      userId: "user_2026_test",
      sessionId: "sess_123",
      getToken: vi.fn().mockResolvedValue("fake-token"),
      signOut: vi.fn(),
    }),
  };
});

// Mock del state global del usuario autenticado
vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: vi.fn(),
}));

describe("Layout Principal", () => {
  beforeEach(() => {
    mockIntersectionObserver();
  });


  it("debe renderizar la pantalla de creación de claves de cifrado si el usuario no las a creado aún", async () => {
    // Simular que el usuario autenticado no tiene claves de autenticación creadas
    (useCurrentUser as any).mockReturnValue({
      user: {
        ...buildMockUser(),
        hasCryptoKeys: false,
        isDisabled: false
      },
      loadingUser: false,
    });

    render(<Layout />, {wrapper: Providers});

    const createCryptoKeysScreen = screen.queryByTestId("create-crypto-keys-screen");

    expect(createCryptoKeysScreen).toBeInTheDocument();
  });


  it("debe renderizar la pantalla de reactivación de cuenta si la cuenta del usuario está desactivada", async () => {
    // Simular que el usuario autenticado tiene su cuenta desactivada
    (useCurrentUser as any).mockReturnValue({
      user: {
        ...buildMockUser(),
        hasCryptoKeys: true,
        isDisabled: true
      },
      loadingUser: false,
    });

    render(<Layout />, {wrapper: Providers});

    const disabledAccountScreen = screen.queryByTestId("disabled-account-screen");

    expect(disabledAccountScreen).toBeInTheDocument();
  });
  

  it("debe renderizar el layout sin el sidebar si está en la página del post details", async () => {
    (useCurrentUser as any).mockReturnValue({
      user: {
        ...buildMockUser(),
        hasCryptoKeys: true,
        isDisabled: false
      },
      loadingUser: false,
    });

    render(
      <Providers initialEntries={["/posts/post_123"]}>
        <Layout />
      </Providers>
    );

    const sidebarWrapper = screen.queryByTestId("sidebar-wrapper");
    expect(sidebarWrapper).not.toBeInTheDocument();
  })
});