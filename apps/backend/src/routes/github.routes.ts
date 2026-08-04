import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import {
  getAuthUrl,
  handleCallback,
  getProfile,
  disconnect,
  getRepositories,
  getRepositoryDetails,
  getBranches
} from '../controllers/github.controller';

const router = Router();

router.use(protect);

router.get('/auth-url', getAuthUrl);
router.post('/callback', handleCallback);
router.get('/profile', getProfile);
router.delete('/disconnect', disconnect);

router.get('/repositories', getRepositories);
router.get('/repositories/:owner/:repo', getRepositoryDetails);
router.get('/repositories/:owner/:repo/branches', getBranches);

export default router;
