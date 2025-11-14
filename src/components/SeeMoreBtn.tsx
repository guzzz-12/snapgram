import type { Dispatch, SetStateAction } from "react";
import { Button } from "./ui/button";

interface Props {
  isClamped: boolean;
  setIsClamped: Dispatch<SetStateAction<boolean>>;
  setShowFullText: Dispatch<SetStateAction<boolean>>;
}

/** Botón para expandir cuerpos de texto truncados */
const SeeMoreBtn = (props: Props) => {
  const { isClamped, setIsClamped, setShowFullText } = props;

  return (
    <Button
      className="inline-block h-auto p-0 text-blue-900 cursor-pointer"
      variant="link"
      onClick={() => {
        setShowFullText(prev => !prev);
        setIsClamped(prev => !prev);
      }}
    >
      {!isClamped ? "Ver menos..." : "Ver más..."}
    </Button>
  )
}

export default SeeMoreBtn