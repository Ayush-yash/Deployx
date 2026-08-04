import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import projectRoutes from './routes/project.routes';
import githubRoutes from './routes/github.routes';
import deploymentRoutes from './routes/deployment.routes';
import analyticsRoutes from './routes/analytics.routes';
import webhookRoutes from './routes/webhook.routes';
import notificationRoutes from './routes/notification.routes';
import kubernetesRoutes from './routes/kubernetes.routes';
import monitoringRoutes from './routes/monitoring.routes';
import { getPrometheusExporterMetrics } from './controllers/monitoring.controller';

const app: Express = express();

app.use(cors());

// Capture raw body for webhook signature verification BEFORE json parser
app.use('/api/webhooks', express.raw({ type: 'application/json' }), (req: Request, _res: Response, next: NextFunction) => {
  if (Buffer.isBuffer(req.body)) {
    (req as any).rawBody = req.body;
    req.body = JSON.parse(req.body.toString());
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Public Prometheus Metrics Exporter Endpoint
app.get('/metrics', getPrometheusExporterMetrics);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/deployments', deploymentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/kubernetes', kubernetesRoutes);
app.use('/api/monitoring', monitoringRoutes);

// Health check route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// Basic error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

export default app;
