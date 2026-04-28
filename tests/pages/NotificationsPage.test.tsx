import { MemoryRouter } from "react-router";
import { render, screen, waitFor, waitForElementToBeRemoved, within } from "@testing-library/react";
import { mockIntersectionObserver } from "jsdom-testing-mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import userEvent from "@testing-library/user-event";
import NotificationsPage from "@/pages/NotificationsPage";
import { server } from "../mocks/server";
import { mockDb } from "../mocks/notificationsRepository";

describe("NotificationsPage", () => {
  const user = userEvent.setup();

  const RenderPage = () => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false
        }
      }
    });

    return (
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <NotificationsPage />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  beforeEach(() => {
    mockIntersectionObserver();
  });

  it("debe renderizar correctamente la página de notificaciones", async () => {
    render(<RenderPage />);

    expect(screen.getByRole("heading", { name: "Notificaciones", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("list")).toBeInTheDocument();
  });

  it("debe renderizar la lista de notificaciones después de que termine de cargar la data", async () => {
    render(<RenderPage />);

    // Esperar a que todos los skeletons hayan sido removidos del dom
    await waitForElementToBeRemoved(() => screen.getAllByTestId("notification-skeleton"));
    expect(screen.queryAllByTestId("notification-skeleton")).toHaveLength(0);
    
    const notificationItems = screen.queryAllByTestId("notification-item");
    expect(notificationItems.length).toBeGreaterThan(0);
  });

  it("debe renderizar mensaje si no hay notificaciones", async () => {
    // Sobreescribir la consulta de las notificaciones para retornar la data vacía
    server.use(http.get("/api/notifications", () => {
      return HttpResponse.json({
        data: [],
        hasMore: false,
        nextPage: null,
        total: 0
      });
    }));

    render(<RenderPage />);

    // Esperar a que todos los skeletons hayan sido removidos del dom
    await waitForElementToBeRemoved(() => screen.getAllByTestId("notification-skeleton"));

    const message = screen.getByText("No tienes notificaciones");
    expect(message).toBeInTheDocument();
  });

  it("debe filtrar las notificaciones por 'todas' y 'no leídas'", async () => {
    render(<RenderPage />);

    // Esperar a que todos los skeletons hayan sido removidos del dom
    await waitForElementToBeRemoved(() => screen.getAllByTestId("notification-skeleton"));

    const unreadButton = screen.getByRole("tab", { name: /no leídas/i });
    expect(unreadButton).toBeInTheDocument();

    await user.click(unreadButton);

    // Obtener las notificaciones filtradas de la base de datos mock
    const filteredNotifications = mockDb.filterByStatus("unread");
    
    // Verificar que se hayan renderizado la cantidad correcta de notificaciones
    const notifications = screen.queryAllByTestId("notification-item");
    expect(notifications).toHaveLength(filteredNotifications.length);
  });

  it("debe marcar todas las notificaciones como leídas al clickear la opción 'Marcar todas como leídas' en el dropdown", async () => {
    render(<RenderPage />);

    // Esperar a que todos los skeletons hayan sido removidos del dom
    await waitForElementToBeRemoved(() => screen.getAllByTestId("notification-skeleton"));

    const dropdownBtn = screen.getByTestId("notifications-options-btn");

    await user.click(dropdownBtn);

    // Dropdown de las opciones de las notificaciones
    const dropDownMenu = screen.queryByRole("menu");
    expect(dropDownMenu).toBeInTheDocument();

    // Opción para marcar todas las notificaciones como leídas
    const markAllAsReadOption = within(dropDownMenu!).queryByTestId("mark-all-as-read-option");
    expect(markAllAsReadOption).toBeInTheDocument();

    await user.click(markAllAsReadOption!);

    // Consultar las notificaciones no leídas en la base de datos mock
    const unread = mockDb.filterByStatus("unread");

    // Verificar que se hayan marcado todas las notificaciones como leídas
    await waitFor(() => {
      expect(unread).toHaveLength(0);
    });
  });
});