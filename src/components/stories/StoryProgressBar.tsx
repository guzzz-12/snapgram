import { useEffect, useState } from "react";

interface Props {
  isOpen: boolean;
  setOpenStoryId: (id: string | null) => void;
}

const StoryProgressBar = (props: Props) => {
  const { isOpen, setOpenStoryId } = props;

  const [timer, setTimer] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let timeout: NodeJS.Timeout;

    if (isOpen) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 100);

      timeout = setTimeout(() => {
        setOpenStoryId(null);
      }, 20000);
    }

    return () => {
      setTimer(0);
      clearInterval(interval);
      clearTimeout(timeout);
    }
  }, [isOpen]);

  return (
    <div className="absolute top-1 left-0 w-full h-[2px] bg-neutral-700">
      <div
        style={{ width: `${(timer / 200) * 100}%` }}
        className="absolute top-0 left-0 h-full bg-white z-10 transition-all"
      />
    </div>
  )
}

export default StoryProgressBar