import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import {
  deployProject,
  getDeployments,
  getDeployment,
  stopDeployment,
  startDeployment,
  deleteDeployment,
  getDeploymentLogs
} from '../controllers/deployment.controller';

const router = Router();

router.use(protect);

router.post('/:projectId/deploy', deployProject);
router.get('/', getDeployments);
router.get('/:id', getDeployment);
router.get('/:id/logs', getDeploymentLogs);
router.post('/:id/stop', stopDeployment);
router.post('/:id/start', startDeployment);
router.delete('/:id', deleteDeployment);

export default router;
