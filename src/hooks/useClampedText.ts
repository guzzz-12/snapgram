import { useEffect, useState, type RefObject } from "react";

interface Props {
  textContentRef: RefObject<HTMLParagraphElement | null>;
  showClampBtnRef: RefObject<"shouldShow" | "shouldNotShow">;
  clampedText?: string;
}

const useClampedText = (props: Props) => {
  const { textContentRef, showClampBtnRef, clampedText } = props;

  const [showFullText, setShowFullText] = useState(false);
  const [isClamped, setIsClamped] = useState(false);

  useEffect(() => {
    // Observar cambios en el tamaño del texto
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      // True si el height del texto completo es mayor al height del texto renderizado
      // El height del texto renderizado es determinado por el line-clamp especificado en el css
      setIsClamped(entry.target.scrollHeight > entry.target.clientHeight);
    });

    if (textContentRef.current) {
      // Verificar si el texto está inicialmente truncado
      const isInitiallyClamped = textContentRef.current.scrollHeight > textContentRef.current.clientHeight;

      // Verificar si debería mostrarse el botón de "Ver más..." en el primer render
      showClampBtnRef.current = isInitiallyClamped ? "shouldShow" : "shouldNotShow";

      resizeObserver.observe(textContentRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    }

  }, [clampedText]);

  return { isClamped, showFullText, setShowFullText, setIsClamped };
}

export default useClampedText