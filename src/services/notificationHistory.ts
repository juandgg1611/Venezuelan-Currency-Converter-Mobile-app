import AsyncStorage from "@react-native-async-storage/async-storage";

export interface NotificationHistoryItem {
  id: string;
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
  type: "bcv" | "usdt" | "system";
}

const HISTORY_KEY = "@finanzas_notification_history";

export const notificationHistoryService = {
  async getHistory(): Promise<NotificationHistoryItem[]> {
    try {
      const raw = await AsyncStorage.getItem(HISTORY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as NotificationHistoryItem[];
      // Return sorted by timestamp descending (newest first)
      return parsed.sort((a, b) => b.timestamp - a.timestamp);
    } catch {
      return [];
    }
  },

  async addNotification(item: Omit<NotificationHistoryItem, "id" | "timestamp" | "read">): Promise<void> {
    try {
      const history = await this.getHistory();
      const newItem: NotificationHistoryItem = {
        ...item,
        id: Date.now().toString() + Math.floor(Math.random() * 1000).toString(),
        timestamp: Date.now(),
        read: false,
      };
      
      const newHistory = [newItem, ...history].slice(0, 50); // Keep max 50 notifications
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    } catch (error) {
      console.error("Error adding notification to history:", error);
    }
  },

  async markAsRead(id: string): Promise<void> {
    try {
      const history = await this.getHistory();
      const newHistory = history.map(item => 
        item.id === id ? { ...item, read: true } : item
      );
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  },

  async deleteNotification(id: string): Promise<void> {
    try {
      const history = await this.getHistory();
      const newHistory = history.filter(item => item.id !== id);
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  },

  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.removeItem(HISTORY_KEY);
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  }
};
