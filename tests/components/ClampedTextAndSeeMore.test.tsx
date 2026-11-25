import { useRef } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ImageKitProvider } from "@imagekit/react";
import { mockIntersectionObserver } from "jsdom-testing-mocks";
import useClampedText from "@/hooks/useClampedText";
import SeeMoreBtn from "@/components/SeeMoreBtn";
import PostCard from "@/components/posts/PostCard";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthContext, type AuthContext as AuthContextType } from "@/providers/AuthProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { buildMockUser } from "../mocks/users/factories";
import { buildMockPostWithLikes } from "../mocks/posts/factories";

type MockObserverInstance = {
  callback: ResizeObserverCallback;
  observe: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  observedTargets: Element[];
};

/**
 * Suite de pruebas unitarias e integración para la detección de truncamiento en DOM
 * (`src/hooks/useClampedText.ts`) y el botón expansor (`src/components/SeeMoreBtn.tsx`).
 *
 * Propósito:
 *   Validar la detección de desbordamiento por `line-clamp` mediante `ResizeObserver`
 *   (`scrollHeight > clientHeight`), la re-observación ante ediciones del texto y su limpieza
 *   al desmontar, la alternancia del botón `SeeMoreBtn` y la expansión completa dentro de `PostCard`.
 *
 * Qué evalúa y alcance (SUTs):
 *   - `useClampedText`: activa `isClamped = true` únicamente cuando `scrollHeight > clientHeight`,
 *     re-instancia y desconecta el `ResizeObserver` al cambiar `clampedTextData`, desconecta al
 *     desmontar y evita invocar `observe` si el ref aún es `null`.
 *   - `SeeMoreBtn`: alterna etiquetas (`"Ver más..."` ↔ `"Ver menos..."`) e invoca
 *     `setShowFullText` y `setIsClamped` invirtiendo el estado previo al hacer clic.
 *   - Integración en `PostCard`: al detectar desbordamiento en el párrafo del post, renderiza
 *     `SeeMoreBtn` y, al hacer clic, cambia la clase de `line-clamp-6` a `line-clamp-none`.
 */
describe("useClampedText y SeeMoreBtn", () => {
  const OriginalResizeObserver = globalThis.ResizeObserver;
  let observerInstances: MockObserverInstance[] = [];
  let queryClient: QueryClient;

  const triggerResizeOnLatest = (target?: Element) => {
    const latest = observerInstances[observerInstances.length - 1];
    if (!latest) throw new Error("No hay instancia de ResizeObserver registrada");
    const targetEl = target ?? latest.observedTargets[0];
    if (!targetEl) throw new Error("No hay elemento observado");

    act(() => {
      latest.callback(
        [{ target: targetEl } as unknown as ResizeObserverEntry],
        latest as unknown as ResizeObserver
      );
    });
  };

  beforeEach(() => {
    observerInstances = [];
    mockIntersectionObserver();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    class ControllableResizeObserver {
      callback: ResizeObserverCallback;
      observedTargets: Element[] = [];
      observe = vi.fn((el: Element) => {
        this.observedTargets.push(el);
      });
      unobserve = vi.fn();
      disconnect = vi.fn();

      constructor(cb: ResizeObserverCallback) {
        this.callback = cb;
        observerInstances.push(this);
      }
    }

    globalThis.ResizeObserver =
      ControllableResizeObserver as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    queryClient.clear();
    useCurrentUser.setState({ user: null, loadingUser: false });
    globalThis.ResizeObserver = OriginalResizeObserver;
  });

  it("detecta truncamiento solo cuando scrollHeight > clientHeight y actualiza isClamped ante cambios de tamaño", () => {
    const Harness = ({ text }: { text: string }) => {
      const ref = useRef<HTMLParagraphElement>(null);
      const { isClamped, showFullText } = useClampedText({
        textContentRef: ref,
        clampedTextData: text
      });

      return (
        <div>
          <p ref={ref} data-testid="clamped-p">
            {text}
          </p>
          <span data-testid="is-clamped">{String(isClamped)}</span>
          <span data-testid="show-full">{String(showFullText)}</span>
        </div>
      );
    };

    render(<Harness text="Texto extenso de prueba" />);

    const paragraph = screen.getByTestId("clamped-p");
    expect(observerInstances).toHaveLength(1);
    expect(observerInstances[0].observe).toHaveBeenCalledWith(paragraph);

    let mockScrollHeight = 100;
    let mockClientHeight = 100;
    Object.defineProperty(paragraph, "scrollHeight", {
      get: () => mockScrollHeight,
      configurable: true
    });
    Object.defineProperty(paragraph, "clientHeight", {
      get: () => mockClientHeight,
      configurable: true
    });

    // Igual altura (100 <= 100) -> no está truncado
    triggerResizeOnLatest(paragraph);
    expect(screen.getByTestId("is-clamped").textContent).toBe("false");

    // scrollHeight > clientHeight (220 > 100) -> truncado
    mockScrollHeight = 220;
    triggerResizeOnLatest(paragraph);
    expect(screen.getByTestId("is-clamped").textContent).toBe("true");

    // Vuelve a caber en el contenedor (100 <= 120) -> ya no está truncado
    mockScrollHeight = 100;
    mockClientHeight = 120;
    triggerResizeOnLatest(paragraph);
    expect(screen.getByTestId("is-clamped").textContent).toBe("false");
  });

  it("desconecta y re-observa el ResizeObserver al cambiar clampedTextData, limpia al desmontar y tolera ref null", () => {
    const NullRefHarness = () => {
      const ref = useRef<HTMLParagraphElement>(null);
      useClampedText({ textContentRef: ref, clampedTextData: "sin nodo" });
      return <div />;
    };

    const nullRender = render(<NullRefHarness />);
    expect(observerInstances).toHaveLength(1);
    expect(observerInstances[0].observe).not.toHaveBeenCalled();
    nullRender.unmount();
    expect(observerInstances[0].disconnect).toHaveBeenCalledTimes(1);

    observerInstances = [];

    const EditableHarness = ({ text }: { text: string }) => {
      const ref = useRef<HTMLParagraphElement>(null);
      useClampedText({ textContentRef: ref, clampedTextData: text });
      return <p ref={ref}>{text}</p>;
    };

    const { rerender, unmount } = render(<EditableHarness text="Versión 1" />);
    expect(observerInstances).toHaveLength(1);
    expect(observerInstances[0].disconnect).not.toHaveBeenCalled();

    // Al editar el texto (cambiar clampedTextData), desconecta el observer anterior y crea uno nuevo
    rerender(<EditableHarness text="Versión 2 editada" />);
    expect(observerInstances).toHaveLength(2);
    expect(observerInstances[0].disconnect).toHaveBeenCalledTimes(1);
    expect(observerInstances[1].observe).toHaveBeenCalledTimes(1);

    unmount();
    expect(observerInstances[1].disconnect).toHaveBeenCalledTimes(1);
  });

  it("SeeMoreBtn muestra 'Ver más...' o 'Ver menos...' según isClamped y alterna ambos estados al hacer clic", async () => {
    const user = userEvent.setup();

    const InteractiveHarness = () => {
      const ref = useRef<HTMLParagraphElement>(null);
      const { isClamped, showFullText, setIsClamped, setShowFullText } = useClampedText({
        textContentRef: ref,
        clampedTextData: "Contenido largo"
      });

      return (
        <div>
          <p ref={ref} data-testid="body">
            Contenido largo
          </p>
          <span data-testid="state">{`${isClamped}:${showFullText}`}</span>
          <SeeMoreBtn
            isClamped={isClamped}
            setIsClamped={setIsClamped}
            setShowFullText={setShowFullText}
          />
        </div>
      );
    };

    render(<InteractiveHarness />);
    const p = screen.getByTestId("body");
    Object.defineProperty(p, "scrollHeight", { value: 300, configurable: true });
    Object.defineProperty(p, "clientHeight", { value: 100, configurable: true });
    triggerResizeOnLatest(p);

    // Con isClamped=true muestra "Ver más..."
    const seeMoreButton = screen.getByRole("button", { name: /Ver m.*s\.\.\./i });
    expect(screen.getByTestId("state").textContent).toBe("true:false");

    await user.click(seeMoreButton);

    // Tras clic: isClamped=false, showFullText=true y texto "Ver menos..."
    expect(screen.getByTestId("state").textContent).toBe("false:true");
    const seeLessButton = screen.getByRole("button", { name: "Ver menos..." });

    await user.click(seeLessButton);
    expect(screen.getByTestId("state").textContent).toBe("true:false");
    expect(screen.getByRole("button", { name: /Ver m.*s\.\.\./i })).toBeInTheDocument();
  });

  it("en PostCard muestra SeeMoreBtn al superar clientHeight y expande el párrafo de line-clamp-6 a line-clamp-none", async () => {
    const user = userEvent.setup();
    const author = buildMockUser({
      _id: "usr_clamp_1",
      clerkId: "clerk_clamp_1",
      fullName: "Nora Larga",
      username: "nora_l"
    });
    const longText = "Línea de texto muy larga para comprobar el truncamiento en PostCard.";
    const post = buildMockPostWithLikes({
      _id: "post_clamp_1",
      postType: "text",
      content: longText,
      imageUrls: [],
      user: {
        _id: author._id,
        clerkId: author.clerkId,
        fullName: author.fullName,
        username: author.username,
        profilePicture: author.profilePicture
      }
    });

    useCurrentUser.setState({ user: author, loadingUser: false });
    const authValue: AuthContextType = {
      userId: author.clerkId,
      isLoaded: true,
      isSignedIn: true,
      signOut: vi.fn().mockResolvedValue(undefined) as unknown as AuthContextType["signOut"],
      getToken: vi.fn().mockResolvedValue("jwt-mock") as unknown as AuthContextType["getToken"]
    };

    render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <ImageKitProvider urlEndpoint="https://ik.imagekit.io/y1lpjbueh/">
            <TooltipProvider>
              <MemoryRouter>
                <PostCard postData={post} editPost={vi.fn()} isPending={false} />
              </MemoryRouter>
            </TooltipProvider>
          </ImageKitProvider>
        </AuthContext.Provider>
      </QueryClientProvider>
    );

    const paragraph = screen.getByText(longText).closest("p")!;
    expect(paragraph.className).toContain("line-clamp-6");
    expect(paragraph.className).not.toContain("line-clamp-none");
    expect(screen.queryByRole("button", { name: /Ver m.*s\.\.\./i })).not.toBeInTheDocument();

    Object.defineProperty(paragraph, "scrollHeight", { value: 260, configurable: true });
    Object.defineProperty(paragraph, "clientHeight", { value: 120, configurable: true });
    triggerResizeOnLatest(paragraph);

    const expandBtn = screen.getByRole("button", { name: /Ver m.*s\.\.\./i });
    await user.click(expandBtn);

    expect(paragraph.className).toContain("line-clamp-none");
    expect(paragraph.className).not.toContain("line-clamp-6");
    expect(screen.queryByRole("button", { name: /Ver m.*s\.\.\./i })).not.toBeInTheDocument();
  });
});
