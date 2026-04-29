import type { ReactNode } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent, { PointerEventsCheckLevel } from "@testing-library/user-event";
import { mockIntersectionObserver } from "jsdom-testing-mocks";
import Layout from "@/Layout";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { imageProcessor } from "@/utils/imageCompressor";
import Providers from "../Providers";
import { buildMockUser } from "../mocks/users/factories";

/** Renderizar el layout y abrir el modal de creación de post */
const setupCreatePost = async () => {
  const user = userEvent.setup({pointerEventsCheck: PointerEventsCheckLevel.Never});

  render(<Layout />, { wrapper: Providers });

  const createBtn = await screen.findByTestId("create-publication-btn");
  await user.click(createBtn);

  const postOption = await screen.findByTestId("create-post-option");
  await user.click(postOption);

  return {
    user
  }
};

// Mockear la utilidad de procesar imágenes
vi.mock("@/utils/imageCompressor", () => ({
  imageProcessor: vi.fn(),
}));

// Mockear los hooks de Clerk
vi.mock("@clerk/clerk-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clerk/clerk-react")>();
  
  return {
    ...actual,
    ClerkProvider: ({ children }: { children: ReactNode }) => {
      return (
        <>
          {children}
        </>
      )
    },
    useUser: vi.fn().mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: {
        id: "user_2026_test",
        fullName: "John Doe",
      },
    }),
    useAuth: () => ({
      isLoaded: true,
      userId: "user_2026_test",
      sessionId: "sess_123",
      getToken: vi.fn().mockResolvedValue("fake-token"),
      signOut: vi.fn(),
    }),
  };
});

// Mock del state global del usuario autenticado
vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: vi.fn(),
}));

describe("CreatePostModal", async () => {
  // Simular la data del usuario en el state global
  (useCurrentUser as any).mockReturnValue({
    user: {
      ...buildMockUser(),
      hasCryptoKeys: true,
      isDisabled: false
    },
    loadingUser: false,
  });

  beforeEach(() => {
    mockIntersectionObserver();
  });

  it("debe mostrar el formulario de crear post al clickear la opción del dropdown y debe hacer autofocus al input del post", async () => {
    await setupCreatePost();
    
    // Esperar a que el formulario aparezca
    const createPostForm = await screen.findByTestId("create-post-form");
    expect(createPostForm).toBeInTheDocument();

    // Probar que el input del formulario sea enfocado automáticamente
    const createPostInput = within(createPostForm).getByTestId("create-post-input");

    await waitFor(() => {
      expect(createPostInput).toHaveFocus();
    }, {timeout: 500});
  });


  it("debe mostrar el botón de submit en disabled inicialmente, luego habilitarse si se tipea al menos un caracter y volver a disabled si se borran todos los caracteres tipeados", async () => {
    const {user} = await setupCreatePost();

    // Esperar a que el formulario aparezca
    const createPostForm = await screen.findByTestId("create-post-form");
    expect(createPostForm).toBeInTheDocument();

    const submitPostBtn = within(createPostForm).getByTestId("create-post-submit-btn");
    expect(submitPostBtn).toBeDisabled();

    // Tipear en el input
    const createPostInput = within(createPostForm).getByTestId("create-post-input");
    await user.type(createPostInput, "Post de prueba...");

    // Chequear si se habilitó del botón de submit
    await waitFor(() => {
      expect(submitPostBtn).not.toBeDisabled();
    }, {timeout: 500});

    // Limpiar el input
    await user.clear(createPostInput);

    // Chequear si se deshabilitó el botón de submit
    await waitFor(() => {
      expect(submitPostBtn).toBeDisabled();
    }, {timeout: 500});
  });


  it("debe habilitarse el botón de submit al seleccionar al menos una imagen", async () => {
    (imageProcessor as any).mockImplementation(() => {
      return new Promise((resolve) => {
        return setTimeout(() => resolve("base64-o-file-mock"), 500);
      });
    });

    const {user} = await setupCreatePost();

    // Esperar a que el formulario aparezca
    const createPostForm = await screen.findByTestId("create-post-form");
    expect(createPostForm).toBeInTheDocument();

    const submitPostBtn = within(createPostForm).queryByTestId("create-post-submit-btn");

    // Verificar que el botón de submit esté deshabilitado inicialmente
    expect(submitPostBtn).toBeDisabled();

    // Seleccionar una imagen
    const file = new File(["test"], "test.png", { type: "image/png" });
    const hiddenFileInput = screen.getByTestId("file-input");
    await user.upload(hiddenFileInput, file);

    // Verificar si el botón se habilita al terminar de procesar la imagen
    await waitFor(() => {
      expect(submitPostBtn).not.toBeDisabled();
    }, {timeout: 2000});

    // Verificar si se muestra el preview de la imagen procesada
    expect(screen.queryByTestId("image-preview-0")).toBeInTheDocument();
  });


  it("debe mostrar toast con mensaje si se seleccionan más de 10 imágenes", async () => {
    (imageProcessor as any).mockImplementation(() => {
      return new Promise((resolve) => {
        return setTimeout(() => resolve("base64-o-file-mock"), 500);
      });
    });

    const {user} = await setupCreatePost();

    // Esperar a que el formulario aparezca
    const createPostForm = await screen.findByTestId("create-post-form");
    expect(createPostForm).toBeInTheDocument();

    // Seleccionar más de 10 imágenes
    const files = new Array(11).fill(0).map(() => new File(["test"], "test.png", { type: "image/png" }));
    const hiddenFileInput = screen.getByTestId("file-input");
    await user.upload(hiddenFileInput, files);

    // Verificar que aparezca el toast de error
    await waitFor(() => {
      expect(screen.queryByText(/máximo de 10 imágenes/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });


  it("debe mostrar el mensaje mientras se comprimen las imágenes seleccionadas", async () => {
    (imageProcessor as any).mockImplementation(() => {
      return new Promise((resolve) => {
        return setTimeout(() => resolve("base64-o-file-mock"), 500);
      });
    });

    const {user} = await setupCreatePost();

    // Esperar a que el formulario aparezca
    const createPostForm = await screen.findByTestId("create-post-form");
    expect(createPostForm).toBeInTheDocument();

    // Seleccionar una imagen
    const file = new File(["test"], "test.png", { type: "image/png" });
    const hiddenFileInput = screen.getByTestId("file-input");
    await user.upload(hiddenFileInput, file);

    // Verificar que aparezca el mensaje de procesando
    await waitFor(() => {
      const message = screen.queryByText(/procesando/i);
      expect(message).toBeInTheDocument();
    }, { timeout: 2000 });

    // Verificar que desaparezca el mensaje de procesando
    await waitFor(() => {
      const message = screen.queryByText(/procesando/i);
      expect(message).not.toBeInTheDocument();
    }, { timeout: 2000 });
  });

  
  it("debe mostrar toast y cerrar el modal al crear el post exitosamente", async () => {
    const {user} = await setupCreatePost();

    // Esperar a que el formulario aparezca
    const createPostForm = await screen.findByTestId("create-post-form");
    expect(createPostForm).toBeInTheDocument();

    // Tipear en el input
    const createPostInput = within(createPostForm).getByTestId("create-post-input");
    await user.type(createPostInput, "Post de prueba...");

    // Hacer click en el botón de submit
    const submitPostBtn = within(createPostForm).getByTestId("create-post-submit-btn");
    await user.click(submitPostBtn);

    expect(createPostInput).toBeDisabled();
    expect(submitPostBtn).toBeDisabled();

    // Verificar que aparezca el toast con mensaje de éxito
    expect(screen.queryByTestId("toast-post-created-success")).toBeInTheDocument();

    // Verificar que el modal se haya cerrado luego de crear el post
    expect(screen.queryByTestId("create-post-modal")).not.toBeInTheDocument();
  });
});