import { Router } from 'express';
import { KubernetesController } from '../controllers/kubernetes.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

router.post('/clusters', KubernetesController.addCluster);
router.post('/clusters/auto-discover', KubernetesController.autoDiscoverCluster);
router.get('/clusters', KubernetesController.getClusters);

router.post('/registries', KubernetesController.addRegistry);
router.get('/registries', KubernetesController.getRegistries);

router.post('/link', KubernetesController.linkToProject);
router.get('/project/:projectId/status', KubernetesController.getClusterStatus);

export default router;
