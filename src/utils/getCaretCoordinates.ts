export interface CaretCoordinates {
  top: number;
  left: number;
  height: number;
}

const propertiesToMirror = [
  "direction", "boxSizing", "width", "height", "overflowX", "overflowY",
  "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", 
  "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth", 
  "borderStyle", "lineHeight", "fontSize", "fontFamily", "fontWeight", 
  "wordWrap", "whiteSpace", "tabSize",
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
  // Usamos offsetTop/offsetLeft (relativo al documento/parent) y restamos el scroll
  // del documento para posicionar el div mirror en la ubicación exacta del textarea.
  style.top = `${element.offsetTop - document.documentElement.scrollTop}px`;
  style.left = `${element.offsetLeft - document.documentElement.scrollLeft}px`;
  style.width = `${element.clientWidth}px`; 
  
  const scrollX = element.scrollLeft;
  const scrollY = element.scrollTop;

  // 3. Llenar el contenido del mirror con el marcador
  const textBeforeCaret = element.value.substring(0, position);
  const textAfterCaret = element.value.substring(position);

  // Normalización de espacios y saltos de linea
  const escapeText = (text: string) => text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>")
    .replace(/\s/g, "&nbsp;");

  const htmlBefore = escapeText(textBeforeCaret);
  const htmlAfter = escapeText(textAfterCaret);
  
  const marker = `<span id="caret-marker"></span>`;
  
  mirrorDiv.innerHTML = htmlBefore + marker + htmlAfter;
  
  const markerElement = document.getElementById("caret-marker");
  if (!markerElement) {
    mirrorDiv.innerHTML = "";
    return { top: 0, left: 0, height: 0 }; 
  }
  // 4. Calcular las coordenadas relativas al contenido del div mirror
  // offsetLeft/offsetTop son las coordenadas del marcador relativas al div mirror.
  // Restamos el scroll interno del textarea para obtener la ubicación visible.
  const coordinates: CaretCoordinates = {
    left: markerElement.offsetLeft - scrollX,
    top: markerElement.offsetTop - scrollY,
    height: markerElement.offsetHeight,
  };
  
  mirrorDiv.innerHTML = "";

  return coordinates;
}