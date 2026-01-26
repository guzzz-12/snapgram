/** Utlidad para convertir un string Base64 en Uint8Array */
export const base64ToUint8 = (base64: string) => {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}