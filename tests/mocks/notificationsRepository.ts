import { buildMockNotification } from "./factories";
import type { NotificationType } from "../../src/types/global";

class MockNotificationsStore {
  data: NotificationType[] = [];

  seed(count = 45) {
    this.data = Array.from({ length: count }, () => buildMockNotification());
  }

  getAll() {
    return this.data;
  }

  getById(id: string) {
    return this.data.find(n => n._id === id);
  }

  markAllAsRead() {
    this.data = this.data.map(n => ({ ...n, isRead: true, isSeen: true }));
  }
}

export const mockDb = new MockNotificationsStore();

mockDb.seed();