import { api } from '../contexts/AuthContext';
import type { Project } from './projectService';

export interface Deployment {
  id: string;
  projectId: string;
  project?: Project;
  status: string;
  version?: number;
  logFile?: string;
  containerName: string | null;
  imageName: string | null;
  containerId: string | null;
  assignedPort: number | null;
  localUrl: string | null;
  framework: string | null;
  branch: string;
  commitHash: string | null;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export const deploymentService = {
  deployProject: async (projectId: string, commitData?: { commitHash: string; commitMessage: string; authorName: string }): Promise<{ deploymentId: string }> => {
    const res = await api.post(`/deployments/${projectId}/deploy`, commitData);
    return res.data.data;
  },

  getDeployments: async (): Promise<Deployment[]> => {
    const res = await api.get('/deployments');
    return res.data.data;
  },

  getDeployment: async (id: string): Promise<Deployment> => {
    const res = await api.get(`/deployments/${id}`);
    return res.data.data;
  },

  getDeploymentLogs: async (id: string): Promise<string> => {
    const res = await api.get(`/deployments/${id}/logs`);
    return res.data.data;
  },

  stopDeployment: async (id: string): Promise<{ status: string }> => {
    const res = await api.post(`/deployments/${id}/stop`);
    return res.data.data;
  },

  startDeployment: async (id: string): Promise<{ status: string }> => {
    const res = await api.post(`/deployments/${id}/start`);
    return res.data.data;
  },

  deleteDeployment: async (id: string): Promise<void> => {
    await api.delete(`/deployments/${id}`);
  }
};
