import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import { getNotifications, markAsRead, markAllAsRead } from '../controllers/notification.controller';

const router = Router();

router.use(protect);

router.get('/', getNotifications);
router.post('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);

export default router;
