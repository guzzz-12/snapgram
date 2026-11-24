import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import ProfileEditModal from "@/components/profile/ProfileEditModal";
import { AuthContext, type AuthContext as AuthContextType } from "@/providers/AuthProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { UserType } from "@/types/global";
import { server } from "../../mocks/server";
import { buildMockUser } from "../../mocks/users/factories";

vi.mock("@/utils/imageCompressor", () => ({
  imageProcessor: vi.fn(async (file: File, output: "base64" | "file") => {
    if (output === "base64") {
      return `data:image/png;base64,mock-${file.name}`;
    }
    return new File(["compressed-bytes"], `compressed-${file.name}`, {
      type: file.type || "image/png"
    });
  })
}));

/**
 * Suite de integración para el modal de edición de perfil y sus editores multimedia
 * (`src/components/profile/ProfileEditModal.tsx`, `ProfileAvatarEdit.tsx` y `ProfileCoverEdit.tsx`).
 *
 * Propósito:
 *   Validar las restricciones del esquema Zod en React Hook Form, el envío de datos válidos
 *   con cierre del modal, y la actualización o eliminación de foto de perfil y foto de portada.
 *
 * Qué evalúa y alcance (SUTs):
 *   - `ProfileEditModal` (validaciones Zod): muestra errores y bloquea `PUT /api/users/update-user`
 *     cuando `fullName > 50`, `username > 50` o `bio > 4200` caracteres.
 *   - `ProfileEditModal` (guardado y cancelación): cancela sin mutar y, con datos válidos,
 *     envía `PUT /api/users/update-user` invocando `onClose(false)` tras `onSuccess`.
 *   - `ProfileAvatarEdit` & `ProfileCoverEdit`: deshabilitan `"Eliminar"` cuando no existe
 *     imagen previa, permiten subir nuevas imágenes (`POST /api/users/user-avatar` y
 *     `POST /api/users/cover-picture`) tras procesarlas con `imageProcessor`, y permiten
 *     eliminarlas (`DELETE /api/users/user-avatar` tras confirmar en `DeleteModal` y
 *     `DELETE /api/users/cover-picture`).
 */
describe("ProfileEditModal", () => {
  let queryClient: QueryClient;

  const baseUser: UserType = buildMockUser({
    _id: "usr_profile_1",
    clerkId: "clerk_profile_1",
    fullName: "Camila Torres",
    username: "camila_t",
    bio: "Desarrolladora frontend",
    profilePicture: "https://example.com/avatar-original.jpg",
    coverPicture: "https://example.com/cover-original.jpg"
  });

  const renderModal = (
    userData: UserType = baseUser,
    onClose: (isOpen: boolean) => void = vi.fn()
  ) => {
    useCurrentUser.setState({ user: userData, loadingUser: false });

    const authValue: AuthContextType = {
      userId: userData.clerkId,
      isLoaded: true,
      isSignedIn: true,
      signOut: vi.fn().mockResolvedValue(undefined) as unknown as AuthContextType["signOut"],
      getToken: vi.fn().mockResolvedValue("jwt-mock") as unknown as AuthContextType["getToken"]
    };

    return {
      onClose,
      ...render(
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider value={authValue}>
            <ProfileEditModal
              userData={userData}
              isOpen={true}
              onClose={onClose}
            />
          </AuthContext.Provider>
        </QueryClientProvider>
      )
    };
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    queryClient.clear();
    useCurrentUser.setState({ user: null, loadingUser: false });
  });

  it("muestra errores de validación Zod si fullName > 50, username > 50 o bio > 4200 caracteres e impide el envío", async () => {
    const user = userEvent.setup();
    let updateRequests = 0;

    server.use(
      http.put("/api/users/update-user", () => {
        updateRequests += 1;
        return HttpResponse.json({ data: baseUser });
      })
    );

    const onClose = vi.fn();
    renderModal(baseUser, onClose);

    const fullNameInput = screen.getByLabelText("Tu nombre");
    const usernameInput = screen.getByLabelText("Tu nombre de usuario");
    const bioInput = screen.getByLabelText("Escribe algo sobre ti");

    fireEvent.change(fullNameInput, { target: { value: "A".repeat(51) } });
    fireEvent.change(usernameInput, { target: { value: "u".repeat(51) } });
    fireEvent.change(bioInput, { target: { value: "b".repeat(4201) } });

    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(
      await screen.findByText(/El nombre no puede tener m.*s de 50 caracteres/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/El nombre de usuario no puede tener m.*s de 50 caracteres/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/La biograf.*a no puede tener m.*s de 4200 caracteres/i)
    ).toBeInTheDocument();

    expect(updateRequests).toBe(0);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("envía los datos válidos con PUT /api/users/update-user, cierra el modal en onSuccess y cancela sin mutar", async () => {
    const user = userEvent.setup();
    const capturedPayload: {
      body: { fullName: string; username: string; bio?: string } | null;
      calls: number;
    } = { body: null, calls: 0 };

    server.use(
      http.put("/api/users/update-user", async ({ request }) => {
        capturedPayload.calls += 1;
        capturedPayload.body = (await request.json()) as typeof capturedPayload.body;
        return HttpResponse.json({
          data: {
            ...baseUser,
            ...capturedPayload.body
          }
        });
      })
    );

    const onClose = vi.fn();
    renderModal(baseUser, onClose);

    // Cancelar cierra el modal sin enviar petición
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onClose).toHaveBeenCalledWith(false);
    expect(capturedPayload.calls).toBe(0);
    onClose.mockClear();

    const fullNameInput = screen.getByLabelText("Tu nombre");
    const usernameInput = screen.getByLabelText("Tu nombre de usuario");
    const bioInput = screen.getByLabelText("Escribe algo sobre ti");

    fireEvent.change(fullNameInput, { target: { value: "Camila Mendoza" } });
    fireEvent.change(usernameInput, { target: { value: "camila_m" } });
    fireEvent.change(bioInput, { target: { value: "Arquitecta de UI" } });

    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledWith(false);
    });

    expect(capturedPayload.calls).toBe(1);
    expect(capturedPayload.body).toEqual({
      fullName: "Camila Mendoza",
      username: "camila_m",
      bio: "Arquitecta de UI"
    });
  });

  it("permite actualizar y eliminar avatar (con confirmación) y portada, deshabilitando Eliminar si no hay imagen previa", async () => {
    const user = userEvent.setup();

    // 1. Usuario sin avatar ni portada -> ambos botones "Eliminar" están deshabilitados
    const userWithoutPhotos = buildMockUser({
      ...baseUser,
      profilePicture: "",
      coverPicture: ""
    });
    const first = renderModal(userWithoutPhotos);

    const deleteButtonsEmpty = screen.getAllByRole("button", { name: "Eliminar" });
    expect(deleteButtonsEmpty).toHaveLength(2);
    expect(deleteButtonsEmpty[0]).toBeDisabled();
    expect(deleteButtonsEmpty[1]).toBeDisabled();
    first.unmount();

    // 2. Usuario con fotos: subir avatar/portada y eliminar avatar/portada
    let avatarPostCalls = 0;
    let avatarDeleteCalls = 0;
    let coverPostCalls = 0;
    let coverDeleteCalls = 0;

    const appendSpy = vi.spyOn(FormData.prototype, "append");

    server.use(
      http.post("/api/users/user-avatar", async ({ request }) => {
        avatarPostCalls += 1;
        await request.text();
        return HttpResponse.json({
          data: {
            ...baseUser,
            profilePicture: "https://example.com/new-avatar.png"
          }
        });
      }),
      http.delete("/api/users/user-avatar", () => {
        avatarDeleteCalls += 1;
        return HttpResponse.json({
          data: {
            ...baseUser,
            profilePicture: ""
          }
        });
      }),
      http.post("/api/users/cover-picture", async ({ request }) => {
        coverPostCalls += 1;
        await request.text();
        return HttpResponse.json({
          data: {
            ...baseUser,
            coverPicture: "https://example.com/new-cover.png"
          }
        });
      }),
      http.delete("/api/users/cover-picture", () => {
        coverDeleteCalls += 1;
        return HttpResponse.json({
          data: {
            ...baseUser,
            coverPicture: ""
          }
        });
      })
    );

    renderModal(baseUser);

    const dialog = screen.getByRole("dialog");
    const fileInputs = dialog.querySelectorAll<HTMLInputElement>('input[type="file"]');
    expect(fileInputs).toHaveLength(2);
    const [avatarInput, coverInput] = Array.from(fileInputs);

    // Subir nueva foto de perfil
    const avatarSection = screen.getByText("Foto de perfil").parentElement!;
    const avatarFile = new File(["avatar-data"], "avatar.png", { type: "image/png" });
    fireEvent.change(avatarInput, { target: { files: [avatarFile] } });

    const saveAvatarBtn = await within(avatarSection).findByRole("button", {
      name: "Guardar"
    });
    await user.click(saveAvatarBtn);

    await waitFor(() => {
      expect(avatarPostCalls).toBe(1);
    });
    expect(appendSpy).toHaveBeenCalledWith(
      "avatar",
      expect.objectContaining({ name: "compressed-avatar.png" })
    );
    expect(useCurrentUser.getState().user?.profilePicture).toBe(
      "https://example.com/new-avatar.png"
    );

    // Eliminar foto de perfil requiere confirmación en DeleteModal
    await user.click(await within(avatarSection).findByRole("button", { name: "Eliminar" }));
    expect(
      await screen.findByRole("heading", { name: "¿Eliminar foto de perfil?" })
    ).toBeInTheDocument();
    expect(avatarDeleteCalls).toBe(0);

    const deleteDialogs = screen.getAllByRole("dialog");
    const confirmDeleteDialog = deleteDialogs[deleteDialogs.length - 1];
    await user.click(within(confirmDeleteDialog).getByRole("button", { name: "Eliminar" }));

    await waitFor(() => {
      expect(avatarDeleteCalls).toBe(1);
    });
    expect(useCurrentUser.getState().user?.profilePicture).toBe("");

    // Subir nueva foto de portada
    const coverSection = screen.getByText("Foto de portada").parentElement!;
    const coverFile = new File(["cover-data"], "cover.png", { type: "image/png" });
    fireEvent.change(coverInput, { target: { files: [coverFile] } });

    const saveCoverBtn = await within(coverSection).findByRole("button", {
      name: "Guardar"
    });
    await user.click(saveCoverBtn);

    await waitFor(() => {
      expect(coverPostCalls).toBe(1);
    });
    expect(appendSpy).toHaveBeenCalledWith(
      "coverPicture",
      expect.objectContaining({ name: "compressed-cover.png" })
    );

    // Eliminar foto de portada
    await user.click(await within(coverSection).findByRole("button", { name: "Eliminar" }));
    await waitFor(() => {
      expect(coverDeleteCalls).toBe(1);
    });
  });
});
