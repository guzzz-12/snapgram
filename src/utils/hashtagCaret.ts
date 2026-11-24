export interface ActiveHashtag {
  /** Texto completo del hashtag bajo el cursor (incluyendo '#') */
  value: string;
  /** Índice de inicio del '#' en el texto */
  start: number;
  /** Índice final del token hashtag en el texto */
  end: number;
}

const HASHTAG_BEFORE_CARET_REGEX = /(?:^|\s)(#[\p{L}\p{N}_]+)$/u;
const TRAILING_HASHTAG_CHARS_REGEX = /^[\p{L}\p{N}_]+/u;

/**
 * Detecta si el cursor está posicionado dentro o al final de un hashtag válido.
 * Devuelve null si hay un rango de texto seleccionado o si '#' está pegado a una palabra previa.
 */
export const getActiveHashtagAtCaret = (
  text: string,
  selectionStart: number,
  selectionEnd: number = selectionStart
): ActiveHashtag | null => {
  if (selectionStart !== selectionEnd) return null;

  const textBeforeCaret = text.slice(0, selectionStart);
  const match = textBeforeCaret.match(HASHTAG_BEFORE_CARET_REGEX);

  if (!match) return null;

  const hashtagBeforeCaret = match[1];
  const start = selectionStart - hashtagBeforeCaret.length;

  // Si el cursor está en medio de un hashtag existente (ej. "#re|act"),
  // incluir los caracteres restantes del mismo token para evitar restos al reemplazar.
  const textAfterCaret = text.slice(selectionStart);
  const trailingMatch = textAfterCaret.match(TRAILING_HASHTAG_CHARS_REGEX);
  const trailingChars = trailingMatch ? trailingMatch[0] : "";
  const end = selectionStart + trailingChars.length;

  return {
    value: hashtagBeforeCaret + trailingChars,
    start,
    end,
  };
};

/**
 * Reemplaza únicamente el hashtag activo en [start, end], añade un espacio si no existe
 * uno justo después, y devuelve el nuevo texto junto con la posición final del cursor.
 */
export const replaceActiveHashtag = (
  text: string,
  activeHashtag: ActiveHashtag,
  replacement: string,
  appendSpace: boolean = true
): { nextText: string; nextCaretPosition: number } => {
  const before = text.slice(0, activeHashtag.start);
  const after = text.slice(activeHashtag.end);

  const normalizedReplacement = replacement.startsWith("#")
    ? replacement
    : `#${replacement}`;

  const hasFollowingWhitespace = /^\s/.test(after);
  const trailingSpace = appendSpace && !hasFollowingWhitespace ? " " : "";

  const nextText = `${before}${normalizedReplacement}${trailingSpace}${after}`;
  const nextCaretPosition =
    activeHashtag.start +
    normalizedReplacement.length +
    (trailingSpace ? 1 : hasFollowingWhitespace ? 1 : 0);

  return { nextText, nextCaretPosition };
};