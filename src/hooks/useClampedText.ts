import { useEffect, useState, type RefObject } from "react";

interface Props {
  /** Referencia del elemento HTML que contiene el texto truncado */
  textContentRef: RefObject<HTMLParagraphElement | null>;
  /** El texto en la data de la publicación.
   * Al editar la publicación esta dependencia restablece el observer
   * y recalcula si el texto actualizado está truncado.
   */
  clampedTextData: string;
}

const useClampedText = (props: Props) => {
  const { textContentRef, clampedTextData } = props;

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
      resizeObserver.observe(textContentRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    }

  }, [clampedTextData]);

  return { isClamped, showFullText, setShowFullText, setIsClamped };
}

export default useClampedText