import { api } from '../contexts/AuthContext';
import type { Deployment } from './deploymentService';

export interface AnalyticsSummary {
  totalProjects: number;
  totalDeployments: number;
  runningDeployments: number;
  stoppedDeployments: number;
  failedDeployments: number;
  successRate: string;
  avgDuration: number;
  deploymentsOverTime: { date: string; count: number }[];
  projectDeployments: { projectName: string; count: number }[];
  statusDistribution: { name: string; value: number }[];
  topProjects: { projectName: string; count: number }[];
}

export const analyticsService = {
  getSummary: async (startDate?: string, endDate?: string): Promise<AnalyticsSummary> => {
    let url = '/analytics/summary';
    if (startDate && endDate) {
      url += `?startDate=${startDate}&endDate=${endDate}`;
    }
    const res = await api.get(url);
    return res.data.data;
  },

  getHistory: async (status?: string, search?: string): Promise<Deployment[]> => {
    let url = '/analytics/history?';
    if (status) url += `status=${status}&`;
    if (search) url += `search=${search}&`;
    
    const res = await api.get(url);
    return res.data.data;
  }
};
