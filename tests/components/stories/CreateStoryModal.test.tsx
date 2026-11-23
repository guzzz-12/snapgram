import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import CreateStoryModal from "@/components/stories/CreateStoryModal";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useCreatePublicationModal } from "@/hooks/useCreatePublicationModal";
import { imageProcessor } from "@/utils/imageCompressor";
import { server } from "../../mocks/server";
import { buildMockStory } from "../../mocks/stories/factories";

vi.mock("@/utils/imageCompressor", () => ({
  imageProcessor: vi.fn()
}));

/**
 * Suite de integración para el modal de creación de historias
 * (`src/components/stories/CreateStoryModal.tsx` y `StoryColorPicker.tsx`).
 *
 * Propósito:
 *   Validar la visibilidad condicional según `useCreatePublicationModal`, la personalización
 *   de historias de texto (colores de fondo, texto y fondo de texto), la subida de imágenes con
 *   alternancia `cover` ↔ `contain`, la guarda de historia vacía, el límite dinámico de texto
 *   por altura y el estado de carga durante la publicación.
 *
 * Qué evalúa y alcance (SUT):
 *   - Apertura condicional: solo se muestra cuando `open === true && publicationType === "story"`.
 *   - Historia de texto y personalización: escritura, selección de fondo en `StoryColorPicker`,
 *     alternancia de color de texto (`#fff` ↔ `#000`) y ciclo completo de fondo de texto
 *     (`transparent` → `#fff` → `#000` → `transparent`), envío multipart `POST /api/stories/create`
 *     con `mediaType="text"`, invalidación de `["stories"]` y cierre del modal.
 *   - Historia de imagen: procesamiento con `imageProcessor`, preview en el lienzo, aparición del
 *     botón `"Contraer imagen"` / `"Expandir imagen"` (`cover` ↔ `contain`) y envío con
 *     `mediaType="image"`, archivo `media` y `imageSize` seleccionado.
 *   - Historia vacía: pulsar `"Publicar historia"` sin texto ni imagen no dispara peticiones HTTP.
 *   - Límite dinámico por altura: bloquea inserción adicional cuando `scrollHeight >= clientHeight - 120`
 *     (permitiendo borrar) y recorta texto pegado vía `onPaste`.
 *   - Cierre con `"Cancelar"` y bloqueo de controles mientras `isLoading === true`.
 */
describe("CreateStoryModal", () => {
  let queryClient: QueryClient;
  let mockContainerClientHeight = 600;
  let mockTextareaScrollHeight = 40;
  let compressedImageFile: File;

  const renderModal = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <CreateStoryModal />
        </TooltipProvider>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    mockContainerClientHeight = 600;
    mockTextareaScrollHeight = 40;

    // En JSDOM clientHeight y scrollHeight son 0 por defecto, lo cual dispararía
    // erróneamente `0 >= 0 - 120` en el cálculo de límite de altura de CreateStoryModal.
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(
      () => mockContainerClientHeight
    );
    vi.spyOn(HTMLTextAreaElement.prototype, "scrollHeight", "get").mockImplementation(
      () => mockTextareaScrollHeight
    );

    compressedImageFile = new File(["compressed-img"], "story-compressed.webp", {
      type: "image/webp"
    });

    vi.mocked(imageProcessor).mockImplementation(async (_file, format) => {
      if (format === "base64") {
        return "data:image/webp;base64,STORY_PREVIEW";
      }
      return compressedImageFile;
    });

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    useCreatePublicationModal.setState({
      open: true,
      publicationType: "story",
      isRepost: false,
      repostedPostId: null
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    queryClient.clear();
    useCreatePublicationModal.setState({
      open: false,
      publicationType: null,
      isRepost: false,
      repostedPostId: null
    });
  });

  it("se abre únicamente cuando open=true y publicationType='story', permaneciendo cerrado para 'post'", () => {
    useCreatePublicationModal.setState({ open: true, publicationType: "post" });

    const { rerender } = renderModal();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    act(() => {
      useCreatePublicationModal.setState({ open: true, publicationType: "story" });
    });

    rerender(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <CreateStoryModal />
        </TooltipProvider>
      </QueryClientProvider>
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Crear historia", { selector: "p" })).toBeInTheDocument();
  });

  it("permite escribir texto, personalizar colores de fondo/fuente/fondo de texto y publicar con mediaType='text'", async () => {
    const user = userEvent.setup();
    let capturedRawBody = "";
    let postRequests = 0;

    server.use(
      http.post("/api/stories/create", async ({ request }) => {
        postRequests += 1;
        capturedRawBody = await request.text();
        return HttpResponse.json({
          data: buildMockStory({
            content: "Buenos días Snapgram",
            mediaType: "text"
          })
        });
      })
    );

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    renderModal();

    const textarea = screen.getByPlaceholderText("¿Qué estás pensando?");
    const canvas = textarea.parentElement as HTMLDivElement;

    await user.type(textarea, "Buenos días Snapgram");
    expect(textarea).toHaveValue("Buenos días Snapgram");

    // 1. Cambiar color de fondo del lienzo mediante StoryColorPicker (Morado = #3A0CA3)
    await user.click(screen.getByRole("button", { name: "Seleccionar color Morado" }));
    expect(canvas.style.backgroundColor).toBe("rgb(58, 12, 163)");

    // 2. Alternar color del texto (#fff -> #000 -> #fff -> #000)
    const textColorBtn = screen.getByRole("button", { name: "Cambiar color del texto" });
    expect(textarea.style.color).toBe("rgb(255, 255, 255)");
    await user.click(textColorBtn);
    expect(textarea.style.color).toBe("rgb(0, 0, 0)");
    await user.click(textColorBtn);
    expect(textarea.style.color).toBe("rgb(255, 255, 255)");
    await user.click(textColorBtn);
    expect(textarea.style.color).toBe("rgb(0, 0, 0)");

    // 3. Ciclar color del fondo del texto: transparent -> #fff -> #000 -> transparent -> #fff
    const textBgBtn = screen.getByRole("button", {
      name: "Cambiar color del fondo del texto"
    });
    expect(textarea.style.backgroundColor).toBe("transparent");
    await user.click(textBgBtn);
    expect(textarea.style.backgroundColor).toBe("rgb(255, 255, 255)");
    await user.click(textBgBtn);
    expect(textarea.style.backgroundColor).toBe("rgb(0, 0, 0)");
    await user.click(textBgBtn);
    expect(textarea.style.backgroundColor).toBe("transparent");
    await user.click(textBgBtn);
    expect(textarea.style.backgroundColor).toBe("rgb(255, 255, 255)");

    // 4. Publicar historia
    await user.click(screen.getByRole("button", { name: "Publicar historia" }));

    await waitFor(() => {
      expect(useCreatePublicationModal.getState().open).toBe(false);
    });

    expect(postRequests).toBe(1);
    expect(capturedRawBody).not.toMatch(/Content-Disposition: form-data; name="media"/);
    expect(capturedRawBody).toMatch(/name="mediaType"\r?\n\r?\ntext\b/);
    expect(capturedRawBody).toMatch(/name="content"\r?\n\r?\nBuenos días Snapgram\b/);
    expect(capturedRawBody).toMatch(/name="backgroundColor"\r?\n\r?\n#3A0CA3\b/);
    expect(capturedRawBody).toMatch(/name="textColor"\r?\n\r?\n#000\b/);
    expect(capturedRawBody).toMatch(/name="textBgColor"\r?\n\r?\n#fff\b/);
    expect(capturedRawBody).toMatch(/name="imageSize"\r?\n\r?\ncover\b/);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["stories"] });
    expect(useCreatePublicationModal.getState().publicationType).toBeNull();
  });

  it("muestra el botón de ajuste cover/contain al subir una imagen y publica con mediaType='image' y el imageSize elegido", async () => {
    const user = userEvent.setup();
    let capturedRawBody = "";

    server.use(
      http.post("/api/stories/create", async ({ request }) => {
        capturedRawBody = await request.text();
        return HttpResponse.json({
          data: buildMockStory({ mediaType: "image", imageSize: "contain" })
        });
      })
    );

    const appendSpy = vi.spyOn(FormData.prototype, "append");

    renderModal();

    // Antes de elegir imagen no aparece el botón de expandir/contraer
    expect(
      screen.queryByRole("button", { name: /Contraer imagen|Expandir imagen/i })
    ).not.toBeInTheDocument();

    const dialog = screen.getByRole("dialog");
    const fileInput = dialog.querySelector('input[type="file"]') as HTMLInputElement;
    const rawFile = new File(["raw-photo"], "foto.png", { type: "image/png" });

    await user.upload(fileInput, rawFile);

    // Aparece el botón "Contraer imagen" (estado inicial cover) y el preview en el lienzo
    const shrinkBtn = await screen.findByRole("button", { name: "Contraer imagen" });
    const textarea = screen.getByPlaceholderText("¿Qué estás pensando?");
    const canvas = textarea.parentElement as HTMLDivElement;

    expect(canvas.style.backgroundImage).toContain("data:image/webp;base64,STORY_PREVIEW");
    expect(canvas.style.backgroundSize).toBe("cover");

    // Alternar cover -> contain -> cover -> contain
    await user.click(shrinkBtn);
    const expandBtn = screen.getByRole("button", { name: "Expandir imagen" });
    expect(canvas.style.backgroundSize).toBe("contain");

    await user.click(expandBtn);
    expect(screen.getByRole("button", { name: "Contraer imagen" })).toBeInTheDocument();
    expect(canvas.style.backgroundSize).toBe("cover");

    await user.click(screen.getByRole("button", { name: "Contraer imagen" }));
    expect(canvas.style.backgroundSize).toBe("contain");

    // Publicar historia con imagen sin texto
    await user.click(screen.getByRole("button", { name: "Publicar historia" }));

    await waitFor(() => {
      expect(useCreatePublicationModal.getState().open).toBe(false);
    });

    expect(appendSpy).toHaveBeenCalledWith("media", compressedImageFile);
    expect(capturedRawBody).toMatch(/Content-Disposition: form-data; name="media"/);
    expect(capturedRawBody).toMatch(/name="mediaType"\r?\n\r?\nimage\b/);
    expect(capturedRawBody).toMatch(/name="imageSize"\r?\n\r?\ncontain\b/);
  });

  it("no dispara la mutación al pulsar 'Publicar historia' si no hay texto ni imagen seleccionada", async () => {
    const user = userEvent.setup();
    let postRequests = 0;

    server.use(
      http.post("/api/stories/create", () => {
        postRequests += 1;
        return HttpResponse.json({ data: buildMockStory() });
      })
    );

    renderModal();

    await user.click(screen.getByRole("button", { name: "Publicar historia" }));
    await new Promise((resolve) => setTimeout(resolve, 40));

    expect(postRequests).toBe(0);
    expect(useCreatePublicationModal.getState().open).toBe(true);
    expect(useCreatePublicationModal.getState().publicationType).toBe("story");
  });

  it("bloquea la escritura al alcanzar el límite de altura (permitiendo borrar) y recorta texto largo al pegar", async () => {
    const user = userEvent.setup();

    renderModal();

    const textarea = screen.getByPlaceholderText(
      "¿Qué estás pensando?"
    ) as HTMLTextAreaElement;

    // 1. Escribir normalmente por debajo del límite (scrollHeight=40 < 600-120=480)
    await user.type(textarea, "Hola");
    expect(textarea).toHaveValue("Hola");

    // Simular que el texto alcanzó el límite de altura (scrollHeight >= 480)
    mockTextareaScrollHeight = 500;
    await user.type(textarea, "!");
    expect(textarea).toHaveValue("Hola!");

    // Con charLimitReached=true, intentar agregar más caracteres queda bloqueado
    await user.type(textarea, "XYZ");
    expect(textarea).toHaveValue("Hola!");

    // Pero borrar caracteres sí está permitido
    mockTextareaScrollHeight = 40;
    await user.type(textarea, "{Backspace}");
    expect(textarea).toHaveValue("Hola");

    // 2. Pegar texto largo: scrollHeight dinámico proporcional a la longitud (100px por carácter)
    // Con containerHeight=600, el límite es 480px => solo caben 4 caracteres (400px < 480px)
    vi.spyOn(HTMLTextAreaElement.prototype, "scrollHeight", "get").mockImplementation(
      function (this: HTMLTextAreaElement) {
        return this.value.length * 100;
      }
    );

    fireEvent.paste(textarea, {
      clipboardData: {
        getData: () => "ABCDEFGHIJ"
      }
    });

    await waitFor(() => {
      expect(textarea).toHaveValue("ABCD");
    });
  });

  it("deshabilita los controles mientras se publica y cierra el modal al pulsar 'Cancelar'", async () => {
    const user = userEvent.setup();

    let markStarted!: () => void;
    const requestStarted = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    let releasePost!: () => void;
    const postGate = new Promise<void>((resolve) => {
      releasePost = resolve;
    });

    server.use(
      http.post("/api/stories/create", async () => {
        markStarted();
        await postGate;
        return HttpResponse.json({ data: buildMockStory() });
      })
    );

    renderModal();

    const textarea = screen.getByPlaceholderText("¿Qué estás pensando?");
    const publishBtn = screen.getByRole("button", { name: "Publicar historia" });
    const cancelBtn = screen.getByRole("button", { name: "Cancelar" });
    const fileInput = screen
      .getByRole("dialog")
      .querySelector('input[type="file"]') as HTMLInputElement;

    await user.type(textarea, "Publicando...");
    await user.click(publishBtn);

    await requestStarted;

    expect(publishBtn).toBeDisabled();
    expect(cancelBtn).toBeDisabled();
    expect(textarea).toBeDisabled();
    expect(fileInput).toBeDisabled();

    await act(async () => {
      releasePost();
    });

    await waitFor(() => {
      expect(useCreatePublicationModal.getState().open).toBe(false);
    });

    // Reabrir modal y verificar cierre con botón "Cancelar"
    act(() => {
      useCreatePublicationModal.setState({ open: true, publicationType: "story" });
    });

    await user.click(await screen.findByRole("button", { name: "Cancelar" }));

    expect(useCreatePublicationModal.getState().open).toBe(false);
    expect(useCreatePublicationModal.getState().publicationType).toBeNull();
  });
});
