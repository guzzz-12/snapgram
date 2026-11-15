import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { AxiosError, type AxiosResponse } from "axios";
import { hashtagParser } from "@/utils/hashtagsParser";
import { generateNotificationLink } from "@/utils/generateNotificationLink";
import { errorMessage } from "@/utils/errorMessage";
import { firstLetterUpperCase } from "@/utils/firstLetterUpperCase";
import { base64ToUint8 } from "@/utils/b64ToUint8";
import { buildMockUser } from "../mocks/users/factories";
import { buildMockPost } from "../mocks/posts/factories";
import type { StoryType } from "@/types/global";

/**
 * Suite unitaria para los formateadores, parsers de texto y helpers puros de UI (`src/utils/`).
 *
 * Propósito:
 *   Validar las funciones utilitarias encargadas de transformar cadenas de texto, construir rutas
 *   de navegación dinámicas, normalizar mensajes de error de red y decodificar arreglos binarios.
 *
 * Qué evalúa y alcance (SUTs):
 *   - `src/utils/hashtagsParser.tsx` (`hashtagParser`): Detección de hashtags (incluyendo caracteres Unicode y `_`) y generación de enlaces `<Link>` hacia `/discover/`.
 *   - `src/utils/generateNotificationLink.ts` (`generateNotificationLink`): Construcción de URLs de destino según el tipo de notificación (`like`, `comment`, `reply`, `postShared`, `follow`, `storyLiked`) y prioridad de `originalPost`.
 *   - `src/utils/errorMessage.ts` (`errorMessage`): Extracción del mensaje de error desde respuestas `AxiosError` o instancias estándar de `Error`.
 *   - `src/utils/firstLetterUpperCase.ts` (`firstLetterUpperCase`): Capitalización del primer carácter de una cadena y manejo de strings vacíos.
 *   - `src/utils/b64ToUint8.ts` (`base64ToUint8`): Conversión exacta de cadenas Base64 a `Uint8Array`.
 */
describe("formattersAndParsers (hashtagParser, generateNotificationLink, errorMessage, firstLetterUpperCase, base64ToUint8)", () => {
  it("convierte múltiples hashtags (incluyendo acentos Unicode y guiones bajos) en componentes Link preservando el texto circundante y retorna null si el texto es vacío", () => {
    expect(hashtagParser("")).toBeNull();

    const text = "Explorando #React_19 y #ProgramaciónWeb hoy!";
    const parsedParts = hashtagParser(text);

    render(
      <MemoryRouter>
        <div data-testid="parsed-container">{parsedParts}</div>
      </MemoryRouter>
    );

    const container = screen.getByTestId("parsed-container");
    expect(container).toHaveTextContent("Explorando #React_19 y #ProgramaciónWeb hoy!");

    const reactLink = screen.getByRole("link", { name: "#React_19" });
    expect(reactLink).toHaveAttribute("href", "/discover/?searchTerm=React_19&type=posts");

    const unicodeLink = screen.getByRole("link", { name: "#ProgramaciónWeb" });
    expect(unicodeLink).toHaveAttribute(
      "href",
      "/discover/?searchTerm=ProgramaciónWeb&type=posts"
    );
  });

  it("genera el enlace correcto en generateNotificationLink según el tipo de notificación y prioriza originalPost._id cuando existe", () => {
    const user = buildMockUser({ clerkId: "clerk_user_99", username: "ana_dev" });
    const post = buildMockPost({ _id: "post_abc_123" });
    const originalPost = buildMockPost({ _id: "original_post_777" });
    const story: StoryType = {
      _id: "story_555",
      user,
      content: "Mi historia",
      textColor: "#fff",
      textBgColor: "transparent",
      mediaUrl: "",
      mediaType: "text",
      backgroundColor: "#000",
      imageSize: "cover",
      seenBy: [],
      likedBy: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Notificaciones sobre posts (like, comment, postShared)
    expect(
      generateNotificationLink({ type: "like", onItem: post, originalPost: null })
    ).toBe("/post/post_abc_123");

    expect(
      generateNotificationLink({ type: "comment", onItem: post, originalPost: null })
    ).toBe("/post/post_abc_123");

    expect(
      generateNotificationLink({ type: "postShared", onItem: post, originalPost: null })
    ).toBe("/post/post_abc_123");

    // Notificación reply priorizando originalPost._id sobre onItem._id
    expect(
      generateNotificationLink({ type: "reply", onItem: post, originalPost })
    ).toBe("/post/original_post_777");

    // Notificación de nuevo seguidor (usa clerkId del UserType)
    expect(
      generateNotificationLink({ type: "follow", onItem: user, originalPost: null })
    ).toBe("/profile/clerk_user_99");

    // Notificación de like en historia
    expect(
      generateNotificationLink({ type: "storyLiked", onItem: story, originalPost: null })
    ).toBe("/stories/ana_dev?storyId=story_555");
  });

  it("extrae error.response.data.message cuando recibe un AxiosError o error.message para un Error estándar", () => {
    const standardError = new Error("Fallo de conexión local");
    expect(errorMessage(standardError)).toBe("Fallo de conexión local");

    const axiosError = new AxiosError(
      "Request failed with status code 400",
      "ERR_BAD_REQUEST",
      undefined,
      undefined,
      {
        data: { message: "El nombre de usuario ya está en uso" },
        status: 400,
        statusText: "Bad Request",
        headers: {},
        config: {} as any
      } as AxiosResponse
    );

    expect(errorMessage(axiosError)).toBe("El nombre de usuario ya está en uso");
  });

  it("capitaliza la primera letra con firstLetterUpperCase y convierte Base64 a Uint8Array con base64ToUint8", () => {
    expect(firstLetterUpperCase("snapgram")).toBe("Snapgram");
    expect(firstLetterUpperCase("a")).toBe("A");
    expect(firstLetterUpperCase("")).toBe("");

    const originalBytes = new Uint8Array([72, 111, 108, 97, 33]); // "Hola!"
    const base64String = btoa(String.fromCharCode(...originalBytes));
    const decodedBytes = base64ToUint8(base64String);

    expect(decodedBytes).toBeInstanceOf(Uint8Array);
    expect(Array.from(decodedBytes)).toEqual([72, 111, 108, 97, 33]);
  });
});
