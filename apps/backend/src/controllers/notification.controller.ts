import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    
    const notifications = await NotificationService.getNotifications(userId, limit);
    
    res.json({ success: true, data: notifications });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    
    await NotificationService.markAsRead(id, userId);
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    await NotificationService.markAllAsRead(userId);
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
