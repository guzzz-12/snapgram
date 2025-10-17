import { useEffect, useState, type RefObject } from "react";

interface Props {
  data: any;
  threshold?: number;
  paginationRef: RefObject<HTMLDivElement | null>;
}

const useIntersectionObserver = ({ data, threshold = 0.5, paginationRef }: Props) => {
  const [isIntersecting, setIsIntersecting] = useState(false);

  // Observar si la referencia de la paginación es visible en el viewport
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      setIsIntersecting(entries[0].isIntersecting);
    }, {threshold});

    if (paginationRef.current) {
      observer.observe(paginationRef.current);
    }

    return () => {
      if (paginationRef.current) {
        observer.unobserve(paginationRef.current);
      }
    }
  }, [data]);

  return { isIntersecting, setIsIntersecting };
}

export default useIntersectionObserver;