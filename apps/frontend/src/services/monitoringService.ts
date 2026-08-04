import { api } from '../contexts/AuthContext';

export interface SystemMetricPoint {
  timestamp: string;
  timeLabel: string;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  memoryUsedMB: number;
  memoryTotalMB: number;
  diskUsagePercent: number;
  diskUsedGB: number;
  diskTotalGB: number;
  networkRxKbps: number;
  networkTxKbps: number;
  load1: number;
  load5: number;
  load15: number;
}

export interface ContainerHealthStatus {
  id: string;
  name: string;
  image: string;
  status: 'Running' | 'Stopped' | 'Healthy' | 'Warning' | 'Error';
  cpuPercent: number;
  memoryUsageMB: number;
  memoryLimitMB: number;
  port: string;
  uptime: string;
  type: 'Docker' | 'Kubernetes';
}

export interface MonitoringResponse {
  current: SystemMetricPoint;
  history: SystemMetricPoint[];
  containers: ContainerHealthStatus[];
  prometheusUrl: string;
}

export const monitoringService = {
  getSystemMetrics: async (): Promise<MonitoringResponse> => {
    const res = await api.get('/monitoring/metrics');
    return res.data.data;
  },

  getRawPrometheusMetrics: async (): Promise<string> => {
    const res = await api.get('/monitoring/prometheus', { responseType: 'text' });
    return res.data;
  }
};
