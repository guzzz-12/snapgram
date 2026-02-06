/** Convertir la primera letra de un texto en mayúscula */
export const firstLetterUpperCase = (text: string) => {
  return text.charAt(0).toUpperCase() + text.slice(1);
}