import { buildMockNotification } from "./factories";
import type { NotificationType } from "@/types/global";

class MockNotificationsStore {
  data: NotificationType[] = [];

  seed(count = 10) {
    this.data = Array.from({ length: count }, () => {
      const isRead = Boolean(Math.round(Math.random()));
      const isSeen = Boolean(Math.round(Math.random()));
      return buildMockNotification({ isRead, isSeen });
    });
  }

  getAll() {
    return this.data;
  }

  getById(id: string) {
    return this.data.find(n => n._id === id);
  }

  markAllAssSeen() {
    this.data = this.data.map(n => ({...n, isSeen: true}));
  }

  markAllAsRead() {
    this.data = this.data.map(n => ({ ...n, isRead: true}));
  }

  filterByStatus(status: "all" | "unread" | "seen") {
    return this.data.filter(n => status === "all" ? n : !n.isRead);
  }
}

export const mockDb = new MockNotificationsStore();

mockDb.seed();