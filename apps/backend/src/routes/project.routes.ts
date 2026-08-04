import express from 'express';
import { createProject, getProjects, getProjectById, updateProject, deleteProject, analyzeRepository } from '../controllers/project.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

router.route('/')
  .post(protect, createProject)
  .get(protect, getProjects);

router.post('/analyze', protect, analyzeRepository);

router.route('/:id')
  .get(protect, getProjectById)
  .put(protect, updateProject)
  .delete(protect, deleteProject);

export default router;
