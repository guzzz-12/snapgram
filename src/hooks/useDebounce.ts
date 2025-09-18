import { useEffect, useState } from "react";

export const useDebounce = (term: string, delay: number = 500) => {
  const [debouncedValue, setDebouncedValue] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(term);
    }, delay);

    return () => {
      clearTimeout(timer);
    }
  }, [term, delay]);

  return {debouncedValue}
} 