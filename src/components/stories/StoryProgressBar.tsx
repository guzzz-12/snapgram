import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
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

  const TIMER_DURATION = 10000;
  const isCurrentStory = activeStoryId === storyId;
  const isLastStory = stories.length - 1 === stories.findIndex((story) => story._id === storyId);

  const [timeRemaining, setTimeRemaining] = useState(TIMER_DURATION);

  useEffect(() => {
    // Resetear el timer cuando se regresa a un story visto
    if (seenStories.includes(storyId) && storyId === activeStoryId) {
      setTimeRemaining(TIMER_DURATION);
    }

    // Finalizar el timer al pasar al siguiente story
    if (seenStories.includes(storyId) && storyId !== activeStoryId) {
      setTimeRemaining(0);
    }

    // Restablecer el state paused cuando se cierra el story
    return () => setIsPaused(false);

  }, [storyId, seenStories, activeStoryId]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    // Actualizar el timer del tiempo restante cada 100ms
    // al story activo si no está pausado
    if (!isPaused && isCurrentStory) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev === 0) {
            return 0;
          }

          return prev - 100;
        });
      }, 100);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    }
  }, [isPaused, stories, activeStoryId, storyId, setTimeRemaining]);

  // Pasar al siguiente story cuando el timer llega a cero
  // Cerrar el viewer al terminar de ver el ultimo story
  useEffect(() => {
    if (timeRemaining <= 0) {
      const currentStoryIndex = stories.findIndex((story) => story._id === storyId);

      if (!isLastStory) {
        const nextStoryId = stories[currentStoryIndex + 1]._id;

        setActiveStoryId(nextStoryId);

        const filteredDuplicates = seenStories.filter((id) => id !== nextStoryId);
        setSeenStories([...filteredDuplicates, nextStoryId]);

      } else {
        navigate("/")
      }
    }
  }, [timeRemaining, isLastStory]);

  return (
    <div className="relative w-full h-[3px] rounded bg-neutral-700 overflow-hidden">
      <div
        style={{ width: `${(1 - (timeRemaining / TIMER_DURATION)) * 100}%` }}
        className="h-full bg-white"
      />
    </div>
  )
}

export default StoryProgressBar