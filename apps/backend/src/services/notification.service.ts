import { emitToUser } from '../socket';
import { prisma } from '../db';

export class NotificationService {
  static async createNotification(userId: string, title: string, message: string, type: 'SUCCESS' | 'ERROR' | 'INFO' | 'WARNING' = 'INFO') {
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type
      }
    });

    // Emit real-time socket event
    emitToUser(userId, 'notification:new', notification);

    // Run cleanup for retention policy
    await this.cleanupOldNotifications(userId);

    return notification;
  }

  static async getNotifications(userId: string, limit = 50) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  static async markAsRead(notificationId: string, userId: string) {
    // Verify ownership
    const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
    if (!notification || notification.userId !== userId) {
      throw new Error('Notification not found or access denied');
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });
  }

  static async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });
  }

  static async cleanupOldNotifications(userId: string) {
    // 30 days retention policy
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    try {
      await prisma.notification.deleteMany({
        where: {
          userId,
          createdAt: { lt: cutoffDate }
        }
      });
    } catch (e) {
      console.error('Failed to cleanup old notifications:', e);
    }
  }
}
