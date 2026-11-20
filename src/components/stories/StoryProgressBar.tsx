import { useEffect, useLayoutEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { useNavigate } from "react-router";
import type { StoryType } from "@/types/global";

interface Props {
  isPaused: boolean;
  activeStoryId: string;
  storyId: string;
  stories: StoryType[];
  seenStories: string[];
  setActiveStoryId: (id: string) => void;
  setIsPaused: (isPaused: boolean) => void;
  setSeenStories: Dispatch<SetStateAction<string[]>>
}

const TIMER_DURATION = 10000;

const StoryProgressBar = (props: Props) => {
  const {
    isPaused,
    stories,
    activeStoryId,
    storyId,
    seenStories,
    setActiveStoryId,
    setIsPaused,
    setSeenStories
  } = props;

  const navigate = useNavigate();

  const barRef = useRef<HTMLDivElement>(null);
  const elapsedRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const frameIdRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  const isCurrentStory = activeStoryId === storyId;
  const isSeen = seenStories.includes(storyId);

  // Mantener referencias frescas sin reiniciar el bucle de animación ante re-renders del padre
  const storiesRef = useRef(stories);
  const navigateRef = useRef(navigate);
  const setActiveStoryIdRef = useRef(setActiveStoryId);
  const setIsPausedRef = useRef(setIsPaused);
  const setSeenStoriesRef = useRef(setSeenStories);

  storiesRef.current = stories;
  navigateRef.current = navigate;
  setActiveStoryIdRef.current = setActiveStoryId;
  setIsPausedRef.current = setIsPaused;
  setSeenStoriesRef.current = setSeenStories;

  // Reiniciar el progreso a 0 cuando esta historia pasa a ser la activa
  useLayoutEffect(() => {
    if (!isCurrentStory) return;

    elapsedRef.current = 0;
    startTimeRef.current = null;
    completedRef.current = false;

    if (barRef.current) {
      barRef.current.style.transform = "scaleX(0)";
    }
  }, [isCurrentStory, storyId]);

  // Establecer el estado visual estático para las historias inactivas (vistas o pendientes)
  useLayoutEffect(() => {
    if (isCurrentStory) return;

    elapsedRef.current = 0;
    startTimeRef.current = null;
    completedRef.current = false;

    if (barRef.current) {
      barRef.current.style.transform = isSeen ? "scaleX(1)" : "scaleX(0)";
    }
  }, [isCurrentStory, isSeen]);

  // Restablecer el estado paused al salir de la historia activa o desmontar el visor
  useEffect(() => {
    if (!isCurrentStory) return;

    return () => {
      setIsPausedRef.current(false);
    };
  }, [isCurrentStory, storyId]);

  // Animar suavemente con requestAnimationFrame + transform: scaleX(...) sin causar reflow ni re-renders
  useEffect(() => {
    if (!isCurrentStory || isPaused || completedRef.current) {
      return;
    }

    const advanceStory = () => {
      if (completedRef.current) return;
      completedRef.current = true;

      const currentStories = storiesRef.current;
      const currentIndex = currentStories.findIndex((story) => story._id === storyId);

      if (currentIndex === -1) return;

      const isLastStory = currentIndex === currentStories.length - 1;

      if (!isLastStory) {
        const nextStoryId = currentStories[currentIndex + 1]._id;
        setActiveStoryIdRef.current(nextStoryId);
        setSeenStoriesRef.current((prev) => [
          ...prev.filter((id) => id !== nextStoryId),
          nextStoryId
        ]);
      } else {
        navigateRef.current("/");
      }
    };

    startTimeRef.current = performance.now();

    const tick = () => {
      if (startTimeRef.current === null) return;

      const totalElapsed = elapsedRef.current + (performance.now() - startTimeRef.current);
      const progress = Math.min(Math.max(totalElapsed / TIMER_DURATION, 0), 1);

      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${progress})`;
      }

      if (progress >= 1) {
        frameIdRef.current = null;
        startTimeRef.current = null;
        advanceStory();
        return;
      }

      frameIdRef.current = requestAnimationFrame(tick);
    };

    frameIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (startTimeRef.current !== null) {
        elapsedRef.current += Math.max(0, performance.now() - startTimeRef.current);
        startTimeRef.current = null;
      }

      if (frameIdRef.current !== null) {
        cancelAnimationFrame(frameIdRef.current);
        frameIdRef.current = null;
      }
    };
  }, [isCurrentStory, isPaused, storyId]);

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Progreso de la historia"
      className="relative w-full h-[3px] rounded bg-neutral-700 overflow-hidden"
    >
      <div
        ref={barRef}
        className="w-full h-full bg-white origin-left will-change-transform"
      />
    </div>
  );
};

export default StoryProgressBar