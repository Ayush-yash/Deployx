import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import {
  getAnalyticsSummary,
  getDeploymentHistory
} from '../controllers/analytics.controller';

const router = Router();

router.use(protect);

router.get('/summary', getAnalyticsSummary);
router.get('/history', getDeploymentHistory);

export default router;
