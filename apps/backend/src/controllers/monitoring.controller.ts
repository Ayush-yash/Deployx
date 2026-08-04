import { Request, Response } from 'express';
import { metricsService } from '../services/metrics.service';

export const getSystemMetrics = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const current = metricsService.getCurrentMetrics();
    const history = metricsService.getMetricsHistory();
    const containers = await metricsService.getContainerHealth(userId);

    res.json({
      success: true,
      data: {
        current,
        history,
        containers,
        prometheusUrl: `${req.protocol}://${req.get('host')}/metrics`,
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPrometheusExporterMetrics = (req: Request, res: Response) => {
  try {
    const prometheusText = metricsService.getPrometheusExposition();
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(prometheusText);
  } catch (error: any) {
    res.status(500).send(`# ERROR: ${error.message}`);
  }
};
