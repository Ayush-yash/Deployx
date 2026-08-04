import { Router } from 'express';
import { handleGitHubWebhook, generateWebhookSecret, toggleAutoDeploy, getWebhookConfig } from '../controllers/webhook.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

// Public: GitHub sends POST events here (no auth middleware)
router.post('/github', handleGitHubWebhook);

// Protected: manage webhook config per project
router.get('/projects/:id/webhook', protect, getWebhookConfig);
router.post('/projects/:id/webhook/generate', protect, generateWebhookSecret);
router.patch('/projects/:id/webhook/toggle', protect, toggleAutoDeploy);

export default router;
