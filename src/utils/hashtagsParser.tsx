import { Link } from "react-router";

/** Convertir en Links los hashtags presentes en un cuerpo de texto */
export const hashtagParser = (text: string) => {
  if (!text) return null;

  const hashtagRegex = /#([\p{L}\p{N}_]+)/gu;
  const parts = [];
  let lastIndex = 0;

  // Encontrar todas las ocurrencias de hashtags válidos (al inicio o precedidos por espacio)
  text.replace(hashtagRegex, (match: string, hashtagText: string, offset: number) => {
    const hasValidBoundary = offset === 0 || /\s/.test(text[offset - 1]);
    if (!hasValidBoundary) {
      return match;
    }

    // Pushear el texto *antes* del hashtag
    if (offset > lastIndex) {
      parts.push(text.substring(lastIndex, offset));
    }

    // Pushear el enlace al hashtag codificando diacríticas/caracteres especiales
    parts.push(
      <Link
        key={`hashtag-${offset}-${hashtagText}`}
        to={`/discover/?searchTerm=${encodeURIComponent(hashtagText)}&type=posts`}
        className="text-blue-500 dark:text-indigo-400 hover:text-blue-600 dark:hover:text-indigo-300"
      >
        {match}
      </Link>
    );

    // Actualizar el index para comenzar a buscar después del match actual
    lastIndex = offset + match.length;

    return match;
  });

  // Pushear el texto *después* del último hashtag
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
};