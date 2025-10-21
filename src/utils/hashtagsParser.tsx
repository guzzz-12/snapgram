import { Link } from "react-router";

/** Convertir en Links los hashtags presentes en un cuerpo de texto */
export const hashtagParser = (text: string) => {
  if (!text) return null;

  const hashtagRegex = /#(\w+)/g;
  const parts = [];
  let lastIndex = 0;

  // Encontrar todas las ocurrencias de hashtags
  // Explicación de los argumentos del callback:
  // - match: El texto completo del hashtag (#hashtagText)
  // - hashtagText: El texto del hashtag (#hashtagText)
  // - offset: La posicion del hashtag en el texto (comienza en 0)
  text.replace(hashtagRegex, (match: string, hashtagText: string, offset: number) => {
    // Pushear el texto *antes* del hashtag
    if (offset > lastIndex) {
      parts.push(text.substring(lastIndex, offset));
    }

    // Pushear el enlace al hashtag    
    parts.push(
      <Link
        // El key es requerido
        key={`hashtag-${offset}-${hashtagText}`}
        to={`/discover/?searchTerm=${hashtagText.replace("#", "")}&type=posts`}
        className="text-blue-500 hover:text-blue-600"
      >
        {match}
      </Link>
    );

    // Actualizar el index para comenzar a buscar despues de la ocurrencia actual
    lastIndex = offset + match.length;

    return match;
  });

  // Pushear el texto *despues* del ultimo hashtag
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
};