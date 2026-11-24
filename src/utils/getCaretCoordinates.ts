export interface CaretCoordinates {
  top: number;
  left: number;
  height: number;
}

const propertiesToMirror = [
  "direction",
  "boxSizing",
  "width",
  "height",
  "overflowX",
  "overflowY",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "borderStyle",
  "lineHeight",
  "fontSize",
  "fontFamily",
  "fontWeight",
  "wordWrap",
  "whiteSpace",
  "tabSize",
];

let mirrorDiv: HTMLDivElement | null = null;

/**
 * Calcula las coordenadas del caret (cursor) en un textarea o input
 * relativo a la esquina superior izquierda del elemento.
 * @param element El elemento HTMLTextAreaElement o HTMLInputElement a medir.
 * @param position El índice de la posición del cursor en el textarea o input. 
 */
export const getCaretCoordinates = (
  element: HTMLTextAreaElement | HTMLInputElement,
  position: number
): CaretCoordinates => {
  if (typeof window === "undefined") {
    return { top: 0, left: 0, height: 0 }; 
  }

  if (!mirrorDiv) {
    mirrorDiv = document.createElement("div");
    document.body.appendChild(mirrorDiv);
  }

  const style = mirrorDiv.style;
  const computed = window.getComputedStyle(element);
  
  // 1. Estilos del mirror div
  style.whiteSpace = "pre-wrap";
  style.wordWrap = "break-word";
  style.position = "absolute";
  style.visibility = "hidden";
  style.overflow = "hidden";

  // Copiar las propiedades CSS necesarias
  propertiesToMirror.forEach((prop) => {
    // @ts-ignore
    style[prop] = computed[prop];
  });

  // 2. Posicionar el div mirror alineado con el textarea en la ventana del navegador.
  style.top = `${element.offsetTop - document.documentElement.scrollTop}px`;
  style.left = `${element.offsetLeft - document.documentElement.scrollLeft}px`;
  style.width = `${element.clientWidth}px`;

  const scrollX = element.scrollLeft;
  const scrollY = element.scrollTop;

  // 3. Llenar el contenido del mirror con nodos de texto reales para preservar el word-wrap nativo sin usar &nbsp;
  const clampedPosition = Math.max(0, Math.min(position, element.value.length));
  const textBeforeCaret = element.value.substring(0, clampedPosition);
  const textAfterCaret = element.value.substring(clampedPosition);

  mirrorDiv.textContent = textBeforeCaret;

  const markerElement = document.createElement("span");
  // Preservar altura de línea si el cursor está al final o en una línea vacía
  markerElement.textContent = textAfterCaret.charAt(0) || "\u200b";
  mirrorDiv.appendChild(markerElement);

  if (textAfterCaret.length > 1) {
    mirrorDiv.appendChild(document.createTextNode(textAfterCaret.slice(1)));
  }
  // 4. Calcular las coordenadas relativas al contenido del div mirror
  const coordinates: CaretCoordinates = {
    left: markerElement.offsetLeft - scrollX,
    top: markerElement.offsetTop - scrollY,
    height: markerElement.offsetHeight,
  };

  mirrorDiv.textContent = "";

  return coordinates;
};