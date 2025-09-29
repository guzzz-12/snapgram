import { useEffect, useState } from "react";
import type { StoryType } from "@/types/global";

interface Props {
  isOpen: boolean;
  isPaused: boolean;
  currentStoryId: string;
  timerStoryId: string;
  stories: StoryType[];
  setOpenUserId: (id: string | null) => void;
  setCurrentStoryId: (id: string) => void;
  setIsPaused: (isPaused: boolean) => void;
}

const StoryProgressBar = (props: Props) => {
  const {
    isOpen,
    isPaused,
    stories,
    currentStoryId,
    timerStoryId,
    setOpenUserId,
    setCurrentStoryId,
    setIsPaused
  } = props;

  const TIMER_DURATION = 10000;

  const [timeRemaining, setTimeRemaining] = useState(TIMER_DURATION);

  // Restablecer el state paused cuando se cierra el story
  useEffect(() => {
    return () => setIsPaused(false);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    const isCurrentStory = currentStoryId === timerStoryId;

    // Actualizar el timer del tiempo restante cada 100ms si el story esta abierto y no esta pausado
    if (isOpen && !isPaused && isCurrentStory) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev === 0) {
            return 0;
          }

          return prev - 100;
        });
      }, 100);
    }

    // Eliminar el timer al pausar el story
    if (interval && isPaused) {
      clearInterval(interval);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    }
  }, [isOpen, isPaused, stories, currentStoryId, timerStoryId, setTimeRemaining]);

  // Pasar al siguiente story cuando el timer llega a cero
  // Cerrar el viewer al terminar de ver el ultimo story
  useEffect(() => {
    if (timeRemaining <= 0) {
      const currentStoryIndex = stories.findIndex((story) => story._id === currentStoryId);
      
      if (currentStoryIndex === stories.length - 1) {
        setOpenUserId(null);
      } else {
        setCurrentStoryId(stories[currentStoryIndex + 1]._id);
      }
    }
  }, [timeRemaining]);

  return (
    <div className="relative w-full h-[3px] rounded bg-neutral-700 overflow-hidden">
      <div
        style={{ width: `${(1 - (timeRemaining / TIMER_DURATION)) * 100}%` }}
        className="h-full bg-white transition-all"
      />
    </div>
  )
}

export default StoryProgressBar