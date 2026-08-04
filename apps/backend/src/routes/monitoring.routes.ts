import { Router } from 'express';
import { getSystemMetrics, getPrometheusExporterMetrics } from '../controllers/monitoring.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

// Protected: JSON endpoint for dashboard charts & metrics
router.get('/metrics', protect, getSystemMetrics);

// Public / Export endpoint for Prometheus scrapers
router.get('/prometheus', getPrometheusExporterMetrics);

export default router;
