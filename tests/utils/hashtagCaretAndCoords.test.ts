import { describe, it, expect, vi, afterEach } from "vitest";
import { getActiveHashtagAtCaret, replaceActiveHashtag } from "@/utils/hashtagCaret";
import { getCaretCoordinates } from "@/utils/getCaretCoordinates";

/**
 * Suite unitaria para las utilidades de detección/reemplazo de hashtags en el cursor
 * (`src/utils/hashtagCaret.ts`) y cálculo de coordenadas del caret
 * (`src/utils/getCaretCoordinates.ts`).
 *
 * Propósito:
 *   Validar la lógica pura de extracción de rangos `[start, end]` para tokens `#tag`
 *   unicode en cualquier posición del cursor, su reemplazo exacto sin duplicar espacios,
 *   y el cálculo de coordenadas sobre el espejo DOM (`mirrorDiv`) respetando `scrollLeft`,
 *   `scrollTop` y clamping de índices.
 *
 * Qué evalúa y alcance (SUTs):
 *   - `getActiveHashtagAtCaret`: detección al inicio, tras espacio y con caracteres unicode;
 *     inclusión de caracteres restantes cuando el cursor está en medio de un token (`#re|act`);
 *     retorno `null` ante selección activa (`selectionStart !== selectionEnd`), `#` pegado a
 *     palabra previa, `#` vacío o cursor fuera del token.
 *   - `replaceActiveHashtag`: sustitución del rango `[start, end]` preservando prefijo y sufijo,
 *     normalización del prefijo `#`, inserción condicional de espacio sin duplicar whitespace
 *     existente y cálculo preciso de `nextCaretPosition`.
 *   - `getCaretCoordinates`: uso de nodos de texto nativos y marcador `<span>` (`\u200b` al
 *     final o primer carácter posterior en medio), clamping de `position`, resta de
 *     `scrollLeft`/`scrollTop` y limpieza de `mirrorDiv.textContent`.
 */
describe("hashtagCaret y getCaretCoordinates", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  describe("getActiveHashtagAtCaret", () => {
    it("detecta un hashtag al inicio, tras espacio y con caracteres unicode", () => {
      expect(getActiveHashtagAtCaret("#react", 6)).toEqual({
        value: "#react",
        start: 0,
        end: 6
      });

      expect(getActiveHashtagAtCaret("Hola #js_2026", 13)).toEqual({
        value: "#js_2026",
        start: 5,
        end: 13
      });

      expect(getActiveHashtagAtCaret("Nuevo #diseño", 13)).toEqual({
        value: "#diseño",
        start: 6,
        end: 13
      });
    });

    it("incluye los caracteres posteriores del mismo token cuando el cursor está en medio (#re|act)", () => {
      const text = "Mira #react hoy";
      // Cursor entre "#re" y "act" (índice 8)
      expect(getActiveHashtagAtCaret(text, 8)).toEqual({
        value: "#react",
        start: 5,
        end: 11
      });
    });

    it("retorna null ante selección de rango, '#' pegado a palabra, '#' solitario o después de espacio", () => {
      // Rango seleccionado en medio de un hashtag válido ("#re|act|")
      expect(getActiveHashtagAtCaret("#react", 3, 6)).toBeNull();
      // '#' pegado a una palabra previa
      expect(getActiveHashtagAtCaret("hola#react", 10)).toBeNull();
      // '#' sin caracteres de palabra
      expect(getActiveHashtagAtCaret("hola #", 6)).toBeNull();
      // Cursor después de un espacio o salto de línea
      expect(getActiveHashtagAtCaret("hola #react ", 12)).toBeNull();
      expect(getActiveHashtagAtCaret("hola #react\n", 12)).toBeNull();
    });
  });

  describe("replaceActiveHashtag", () => {
    it("reemplaza el rango exacto normalizando '#' y agregando espacio si no existe uno después", () => {
      const active = { value: "#rea", start: 5, end: 9 };
      const result = replaceActiveHashtag("Hola #rea!", active, "react", true);

      expect(result).toEqual({
        nextText: "Hola #react !",
        nextCaretPosition: 12
      });
    });

    it("evita duplicar espacio cuando el texto posterior ya comienza con espacio y respeta appendSpace=false", () => {
      const active = { value: "#re", start: 6, end: 9 };

      const withExistingSpace = replaceActiveHashtag(
        "Antes #re despues",
        active,
        "#react",
        true
      );
      expect(withExistingSpace).toEqual({
        nextText: "Antes #react despues",
        nextCaretPosition: 13
      });

      const withoutAppendSpace = replaceActiveHashtag(
        "Antes #re",
        active,
        "#react",
        false
      );
      expect(withoutAppendSpace).toEqual({
        nextText: "Antes #react",
        nextCaretPosition: 12
      });
    });
  });

  describe("getCaretCoordinates", () => {
    it("calcula left/top descontando scrollLeft/scrollTop, usa nodos de texto + marcador '\\u200b' y clampea índices", () => {
      const textarea = document.createElement("textarea");
      textarea.value = "Hola #react";
      document.body.appendChild(textarea);

      Object.defineProperty(textarea, "scrollLeft", { value: 10, configurable: true });
      Object.defineProperty(textarea, "scrollTop", { value: 15, configurable: true });

      const originalCreateElement = document.createElement.bind(document);
      let lastMarker: HTMLSpanElement | null = null;
      let markerTextAtRead = "";

      vi.spyOn(document, "createElement").mockImplementation(((tagName: string) => {
        const el = originalCreateElement(tagName);
        if (tagName.toLowerCase() === "span") {
          lastMarker = el as HTMLSpanElement;
          Object.defineProperty(el, "offsetLeft", {
            get: () => {
              markerTextAtRead = el.textContent ?? "";
              return 84;
            },
            configurable: true
          });
          Object.defineProperty(el, "offsetTop", { value: 55, configurable: true });
          Object.defineProperty(el, "offsetHeight", { value: 22, configurable: true });
        }
        return el;
      }) as typeof document.createElement);

      // 1. Posición mayor a value.length -> se clampea al final y el marcador usa '\u200b'
      const endCoords = getCaretCoordinates(textarea, 999);
      expect(endCoords).toEqual({ left: 74, top: 40, height: 22 });
      expect(markerTextAtRead).toBe("\u200b");
      expect(lastMarker).not.toBeNull();

      // 2. Posición negativa -> se clampea a 0 y el marcador toma el primer carácter ('H')
      const startCoords = getCaretCoordinates(textarea, -5);
      expect(startCoords).toEqual({ left: 74, top: 40, height: 22 });
      expect(markerTextAtRead).toBe("H");

      // 3. El mirrorDiv en document.body queda limpio tras medir
      const mirrorDivs = Array.from(document.body.querySelectorAll("div")).filter(
        (d) => d.style.visibility === "hidden"
      );
      expect(mirrorDivs.length).toBeGreaterThan(0);
      expect(mirrorDivs[mirrorDivs.length - 1].textContent).toBe("");
    });
  });
});
