import { useEffect, useState } from "react";

interface Props {
  isOpen: boolean;
  isPaused: boolean;
  setOpenStoryId: (id: string | null) => void;
  setIsPaused: (isPaused: boolean) => void;
}

const StoryProgressBar = (props: Props) => {
  const { isOpen, isPaused, setOpenStoryId, setIsPaused } = props;
  
  const [timeRemaining, setTimeRemaining] = useState(20000);

  // Restablecer el state paused cuando se cierra el story
  useEffect(() => {
    return () => setIsPaused(false);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    // Actualizar el timer del tiempo restante cada 100ms si el story esta abierto y no esta pausado
    if (isOpen && !isPaused) {
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
  }, [isOpen, isPaused, setTimeRemaining]);

  if (timeRemaining === 0) {
    setOpenStoryId(null);
  }

  return (
    <div className="absolute top-1 left-0 w-full h-[2px] bg-neutral-700">
      <div
        style={{ width: `${(1 - (timeRemaining / 20000)) * 100}%` }}
        className="absolute top-0 left-0 h-full bg-white z-10 transition-all"
      />
    </div>
  )
}

export default StoryProgressBar