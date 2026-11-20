import { useState } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import StoryProgressBar from "@/components/stories/StoryProgressBar";
import type { StoryType } from "@/types/global";
import { buildMockStory } from "../../mocks/stories/factories";

const getScaleX = (barElement: HTMLElement): number => {
  const match = barElement.style.transform.match(/scaleX\(([^)]+)\)/);
  return match ? Number(match[1]) : NaN;
};

describe("StoryProgressBar", () => {
  let stories: StoryType[];

  beforeEach(() => {
    vi.useFakeTimers();
    stories = [
      buildMockStory({ _id: "st_1" }),
      buildMockStory({ _id: "st_2" }),
      buildMockStory({ _id: "st_3" })
    ];
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
    vi.restoreAllMocks();
  });

  const renderBars = (options?: {
    initialActiveStoryId?: string;
    initialSeenStories?: string[];
    initialIsPaused?: boolean;
    onActiveStoryChange?: (id: string) => void;
    onPausedChange?: (paused: boolean) => void;
  }) => {
    const Wrapper = ({
      storiesProp = stories,
      isPausedOverride,
      activeStoryOverride,
      seenStoriesOverride
    }: {
      storiesProp?: StoryType[];
      isPausedOverride?: boolean;
      activeStoryOverride?: string;
      seenStoriesOverride?: string[];
    }) => {
      const [activeStoryId, setActiveStoryId] = useState(
        options?.initialActiveStoryId ?? storiesProp[0]._id
      );
      const [seenStories, setSeenStories] = useState<string[]>(
        options?.initialSeenStories ?? [storiesProp[0]._id]
      );
      const [isPaused, setIsPaused] = useState(options?.initialIsPaused ?? false);

      const resolvedActiveId = activeStoryOverride ?? activeStoryId;
      const resolvedSeen = seenStoriesOverride ?? seenStories;
      const resolvedPaused = isPausedOverride ?? isPaused;

      return (
        <MemoryRouter initialEntries={["/stories/ana"]}>
          <Routes>
            <Route path="/" element={<div data-testid="home-route">Home</div>} />
            <Route
              path="/stories/:username"
              element={
                <div>
                  <div data-testid="active-id">{resolvedActiveId}</div>
                  <div data-testid="seen-ids">{resolvedSeen.join(",")}</div>
                  <div data-testid="paused-state">{String(resolvedPaused)}</div>
                  {storiesProp.map((story) => (
                    <StoryProgressBar
                      key={story._id}
                      isPaused={resolvedPaused}
                      stories={storiesProp}
                      storyId={story._id}
                      activeStoryId={resolvedActiveId}
                      seenStories={resolvedSeen}
                      setActiveStoryId={(id) => {
                        setActiveStoryId(id);
                        options?.onActiveStoryChange?.(id);
                      }}
                      setIsPaused={(paused) => {
                        setIsPaused(paused);
                        options?.onPausedChange?.(paused);
                      }}
                      setSeenStories={setSeenStories}
                    />
                  ))}
                </div>
              }
            />
          </Routes>
        </MemoryRouter>
      );
    };

    const result = render(<Wrapper />);

    return {
      ...result,
      rerenderWith: (props: {
        storiesProp?: StoryType[];
        isPausedOverride?: boolean;
        activeStoryOverride?: string;
        seenStoriesOverride?: string[];
      }) => result.rerender(<Wrapper {...props} />)
    };
  };

  it("rellena la barra activa de forma continua mediante transform: scaleX() en cada frame sin animar width", async () => {
    renderBars();

    const progressBars = screen.getAllByRole("progressbar");
    const firstFill = progressBars[0].firstElementChild as HTMLElement;
    const secondFill = progressBars[1].firstElementChild as HTMLElement;
    const thirdFill = progressBars[2].firstElementChild as HTMLElement;

    expect(firstFill).toHaveClass("w-full", "origin-left", "will-change-transform");
    expect(getScaleX(firstFill)).toBe(0);
    expect(getScaleX(secondFill)).toBe(0);
    expect(getScaleX(thirdFill)).toBe(0);
    expect(firstFill.style.width).toBe("");

    // Avanza un frame (~16ms) y verifica progreso continuo menor a 100ms
    await act(async () => {
      await vi.advanceTimersByTimeAsync(16);
    });
    const scaleAfter16ms = getScaleX(firstFill);
    expect(scaleAfter16ms).toBeGreaterThan(0);
    expect(scaleAfter16ms).toBeLessThan(0.01);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(16);
    });
    const scaleAfter32ms = getScaleX(firstFill);
    expect(scaleAfter32ms).toBeGreaterThan(scaleAfter16ms);
    expect(firstFill.style.width).toBe("");

    // A mitad de duración (~5000ms)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4968);
    });
    expect(getScaleX(firstFill)).toBeCloseTo(0.5, 2);
  });

  it("muestra scaleX(1) en historias ya vistas y scaleX(0) en historias pendientes", () => {
    renderBars({
      initialActiveStoryId: "st_2",
      initialSeenStories: ["st_1", "st_2"]
    });

    const progressBars = screen.getAllByRole("progressbar");
    const firstFill = progressBars[0].firstElementChild as HTMLElement;
    const secondFill = progressBars[1].firstElementChild as HTMLElement;
    const thirdFill = progressBars[2].firstElementChild as HTMLElement;

    expect(getScaleX(firstFill)).toBe(1);
    expect(getScaleX(secondFill)).toBe(0);
    expect(getScaleX(thirdFill)).toBe(0);
  });

  it("avanza automáticamente a la siguiente historia al cumplirse 10000ms y navega a '/' al finalizar la última", async () => {
    renderBars();

    // Terminar historia 1 -> pasa a historia 2
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    expect(screen.getByTestId("active-id")).toHaveTextContent("st_2");
    expect(screen.getByTestId("seen-ids")).toHaveTextContent("st_1,st_2");

    const barsAfterFirst = screen.getAllByRole("progressbar");
    expect(getScaleX(barsAfterFirst[0].firstElementChild as HTMLElement)).toBe(1);

    // Terminar historia 2 -> pasa a historia 3
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    expect(screen.getByTestId("active-id")).toHaveTextContent("st_3");
    expect(screen.getByTestId("seen-ids")).toHaveTextContent("st_1,st_2,st_3");

    // Terminar historia 3 (última) -> navega a "/"
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    expect(screen.getByTestId("home-route")).toBeInTheDocument();
  });

  it("pausa el progreso exactamente en el punto actual y lo reanuda desde ahí sin saltos", async () => {
    const { rerenderWith } = renderBars();

    const firstFill = screen.getAllByRole("progressbar")[0].firstElementChild as HTMLElement;

    // Avanzar 4000ms (40%)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });
    const pausedScale = getScaleX(firstFill);
    expect(pausedScale).toBeCloseTo(0.4, 2);

    // Pausar y dejar pasar 5000ms: la barra no debe avanzar ni cambiar de historia
    rerenderWith({ isPausedOverride: true });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(getScaleX(firstFill)).toBeCloseTo(pausedScale, 4);
    expect(screen.getByTestId("active-id")).toHaveTextContent("st_1");

    // Reanudar: debe faltar ~6000ms para completar
    rerenderWith({ isPausedOverride: false });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(getScaleX(firstFill)).toBeCloseTo(0.7, 2);
    expect(screen.getByTestId("active-id")).toHaveTextContent("st_1");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3016);
    });

    expect(screen.getByTestId("active-id")).toHaveTextContent("st_2");
  });

  it("reinicia el progreso a scaleX(0) cuando se regresa a una historia ya vista", async () => {
    const { rerenderWith } = renderBars({
      initialActiveStoryId: "st_2",
      initialSeenStories: ["st_1", "st_2"]
    });

    const firstFill = screen.getAllByRole("progressbar")[0].firstElementChild as HTMLElement;
    const secondFill = screen.getAllByRole("progressbar")[1].firstElementChild as HTMLElement;

    expect(getScaleX(firstFill)).toBe(1);

    // Simular regreso a la historia anterior (prevStoryHandler en StoriesViewer)
    rerenderWith({
      activeStoryOverride: "st_1",
      seenStoriesOverride: ["st_1"]
    });

    expect(getScaleX(firstFill)).toBe(0);
    expect(getScaleX(secondFill)).toBe(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(getScaleX(firstFill)).toBeCloseTo(0.5, 2);
  });

  it("no reinicia ni despausa la historia activa cuando el padre re-renderiza con un nuevo arreglo stories o nueva referencia de setIsPaused", async () => {
    const { rerenderWith } = renderBars();

    const firstFill = screen.getAllByRole("progressbar")[0].firstElementChild as HTMLElement;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(getScaleX(firstFill)).toBeCloseTo(0.3, 2);

    // Simular refetch/actualización de likes que crea una nueva referencia de `stories`
    const updatedStories = stories.map((story) => ({ ...story }));
    rerenderWith({ storiesProp: updatedStories, isPausedOverride: true });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    // Sigue pausado y conserva el progreso acumulado (~0.3), sin haber sido reiniciado ni despausado
    expect(screen.getByTestId("paused-state")).toHaveTextContent("true");
    expect(getScaleX(firstFill)).toBeCloseTo(0.3, 2);
  });

  it("restablece isPaused a false al cambiar a la siguiente historia", async () => {
    const onPausedChange = vi.fn();
    const { rerenderWith } = renderBars({
      initialIsPaused: true,
      onPausedChange
    });

    expect(screen.getByTestId("paused-state")).toHaveTextContent("true");

    rerenderWith({
      activeStoryOverride: "st_2",
      seenStoriesOverride: ["st_1", "st_2"]
    });

    expect(onPausedChange).toHaveBeenCalledWith(false);
    expect(screen.getByTestId("paused-state")).toHaveTextContent("false");
  });
});
