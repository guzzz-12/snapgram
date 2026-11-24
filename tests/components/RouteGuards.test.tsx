import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router";
import ProtectedRoute from "@/components/ProtectedRoute";
import NoAuthRoute from "@/components/NoAuthRoute";
import { AuthContext, type AuthContext as AuthContextType } from "@/providers/AuthProvider";

/**
 * Suite de integración para las guardas de navegación basadas en autenticación
 * (`src/components/ProtectedRoute.tsx` y `src/components/NoAuthRoute.tsx`).
 *
 * Propósito:
 *   Validar el control de acceso a rutas privadas y públicas en los tres estados posibles de
 *   Clerk (`!isLoaded`, autenticado y no autenticado), garantizando que las redirecciones
 *   usen `replace` sobre el historial de navegación.
 *
 * Qué evalúa y alcance (SUTs):
 *   - `ProtectedRoute`: retorna `null` sin redirigir cuando `!isLoaded`, redirige a `"/login"`
 *     con `replace` cuando `isLoaded && !isSignedIn`, y renderiza `children` cuando
 *     `isLoaded && isSignedIn`.
 *   - `NoAuthRoute`: retorna `null` sin redirigir cuando `!isLoaded`, redirige a `"/"` con
 *     `replace` cuando `isLoaded && isSignedIn`, y renderiza `children` cuando
 *     `isLoaded && !isSignedIn`.
 */
describe("RouteGuards (ProtectedRoute y NoAuthRoute)", () => {
  const buildAuthContext = (
    overrides: Partial<Pick<AuthContextType, "isLoaded" | "isSignedIn" | "userId">>
  ): AuthContextType => ({
    userId: overrides.isSignedIn ? "clerk_user_1" : null,
    isLoaded: true,
    isSignedIn: false,
    signOut: vi.fn().mockResolvedValue(undefined) as unknown as AuthContextType["signOut"],
    getToken: vi.fn().mockResolvedValue("jwt-mock") as unknown as AuthContextType["getToken"],
    ...overrides
  });

  const LocationAndBackHarness = () => {
    const location = useLocation();
    const navigate = useNavigate();
    return (
      <>
        <div data-testid="current-location">{location.pathname}</div>
        <button type="button" onClick={() => navigate(-1)}>
          Volver
        </button>
      </>
    );
  };

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe("ProtectedRoute", () => {
    const renderProtected = (
      authOverrides: Partial<Pick<AuthContextType, "isLoaded" | "isSignedIn">>,
      initialEntries: string[] = ["/messages"],
      initialIndex = initialEntries.length - 1
    ) => {
      return render(
        <AuthContext.Provider value={buildAuthContext(authOverrides)}>
          <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
            <Routes>
              <Route path="/public-prev" element={<div>Página previa</div>} />
              <Route path="/login" element={<div>Pantalla de Login</div>} />
              <Route
                path="/messages"
                element={
                  <ProtectedRoute>
                    <div>Contenido Protegido</div>
                  </ProtectedRoute>
                }
              />
            </Routes>
            <LocationAndBackHarness />
          </MemoryRouter>
        </AuthContext.Provider>
      );
    };

    it("retorna null sin redirigir ni mostrar children mientras !isLoaded", () => {
      const first = renderProtected({ isLoaded: false, isSignedIn: false });
      expect(screen.queryByText("Contenido Protegido")).not.toBeInTheDocument();
      expect(screen.queryByText("Pantalla de Login")).not.toBeInTheDocument();
      expect(screen.getByTestId("current-location").textContent).toBe("/messages");
      first.unmount();

      renderProtected({ isLoaded: false, isSignedIn: true });
      expect(screen.queryByText("Contenido Protegido")).not.toBeInTheDocument();
      expect(screen.queryByText("Pantalla de Login")).not.toBeInTheDocument();
      expect(screen.getByTestId("current-location").textContent).toBe("/messages");
    });

    it("redirige a '/login' con replace cuando isLoaded es true y !isSignedIn", async () => {
      const user = userEvent.setup();

      renderProtected(
        { isLoaded: true, isSignedIn: false },
        ["/public-prev", "/messages"],
        1
      );

      expect(screen.queryByText("Contenido Protegido")).not.toBeInTheDocument();
      expect(screen.getByText("Pantalla de Login")).toBeInTheDocument();
      expect(screen.getByTestId("current-location").textContent).toBe("/login");

      // Al retroceder, como la redirección usó replace, regresa a /public-prev y no queda atrapado en /messages
      await user.click(screen.getByRole("button", { name: "Volver" }));
      expect(screen.getByTestId("current-location").textContent).toBe("/public-prev");
      expect(screen.getByText("Página previa")).toBeInTheDocument();
    });

    it("renderiza children cuando isLoaded y isSignedIn son true", () => {
      renderProtected({ isLoaded: true, isSignedIn: true });

      expect(screen.getByText("Contenido Protegido")).toBeInTheDocument();
      expect(screen.queryByText("Pantalla de Login")).not.toBeInTheDocument();
      expect(screen.getByTestId("current-location").textContent).toBe("/messages");
    });
  });

  describe("NoAuthRoute", () => {
    const renderNoAuth = (
      authOverrides: Partial<Pick<AuthContextType, "isLoaded" | "isSignedIn">>,
      initialEntries: string[] = ["/login"],
      initialIndex = initialEntries.length - 1
    ) => {
      return render(
        <AuthContext.Provider value={buildAuthContext(authOverrides)}>
          <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
            <Routes>
              <Route path="/settings" element={<div>Pantalla Ajustes</div>} />
              <Route path="/" element={<div>Feed Principal</div>} />
              <Route
                path="/login"
                element={
                  <NoAuthRoute>
                    <div>Formulario de Login</div>
                  </NoAuthRoute>
                }
              />
            </Routes>
            <LocationAndBackHarness />
          </MemoryRouter>
        </AuthContext.Provider>
      );
    };

    it("retorna null sin redirigir ni mostrar children mientras !isLoaded", () => {
      const first = renderNoAuth({ isLoaded: false, isSignedIn: true });
      expect(screen.queryByText("Formulario de Login")).not.toBeInTheDocument();
      expect(screen.queryByText("Feed Principal")).not.toBeInTheDocument();
      expect(screen.getByTestId("current-location").textContent).toBe("/login");
      first.unmount();

      renderNoAuth({ isLoaded: false, isSignedIn: false });
      expect(screen.queryByText("Formulario de Login")).not.toBeInTheDocument();
      expect(screen.queryByText("Feed Principal")).not.toBeInTheDocument();
      expect(screen.getByTestId("current-location").textContent).toBe("/login");
    });

    it("redirige a '/' con replace cuando isLoaded y isSignedIn son true", async () => {
      const user = userEvent.setup();

      renderNoAuth(
        { isLoaded: true, isSignedIn: true },
        ["/settings", "/login"],
        1
      );

      expect(screen.queryByText("Formulario de Login")).not.toBeInTheDocument();
      expect(screen.getByText("Feed Principal")).toBeInTheDocument();
      expect(screen.getByTestId("current-location").textContent).toBe("/");

      // Al retroceder, como la redirección usó replace, regresa a /settings y no rebota en /login
      await user.click(screen.getByRole("button", { name: "Volver" }));
      expect(screen.getByTestId("current-location").textContent).toBe("/settings");
      expect(screen.getByText("Pantalla Ajustes")).toBeInTheDocument();
    });

    it("renderiza children cuando isLoaded es true y !isSignedIn", () => {
      renderNoAuth({ isLoaded: true, isSignedIn: false });

      expect(screen.getByText("Formulario de Login")).toBeInTheDocument();
      expect(screen.queryByText("Feed Principal")).not.toBeInTheDocument();
      expect(screen.getByTestId("current-location").textContent).toBe("/login");
    });
  });
});
