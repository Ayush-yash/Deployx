import { api } from '../contexts/AuthContext';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'SUCCESS' | 'ERROR' | 'INFO' | 'WARNING';
  isRead: boolean;
  createdAt: string;
}

export const notificationService = {
  getNotifications: async (limit: number = 50): Promise<Notification[]> => {
    const res = await api.get(`/notifications?limit=${limit}`);
    return res.data.data;
  },

  markAsRead: async (id: string): Promise<void> => {
    await api.put(`/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await api.post('/notifications/read-all');
  }
};
