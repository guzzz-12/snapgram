import { render, screen } from "@testing-library/react";
import { mockIntersectionObserver } from "jsdom-testing-mocks";
import NotificationsPage from "@/pages/NotificationsPage";
import Providers from "../Providers";

describe("NotificationsPage", () => {
  beforeEach(() => {
    mockIntersectionObserver();
  });

  it("debe renderizar correctamente la página de notificaciones", async () => {
    render(<NotificationsPage />, {wrapper: Providers});

    expect(screen.getByText("Notificaciones")).toBeInTheDocument();
  })
});