import { api } from '../contexts/AuthContext';

export interface Project {
  id: string;
  name: string;
  githubUrl: string;
  branch: string;
  framework: string;
  port?: number | null;
  environmentVariables?: Record<string, string>;
  description?: string | null;
  status: string;
  language?: string | null;
  runtime?: string | null;
  packageManager?: string | null;
  buildCommand?: string | null;
  startCommand?: string | null;
  outputDirectory?: string | null;
  hasDockerfile?: boolean;
  hasDockerCompose?: boolean;
  dockerfileContent?: string | null;
  autoDeploy?: boolean;
  webhookSecret?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisResult {
  framework: string;
  language: string;
  runtime: string;
  packageManager: string;
  buildCommand: string;
  startCommand: string;
  outputDirectory: string;
  hasDockerfile: boolean;
  hasDockerCompose: boolean;
  environmentVariables: Record<string, string>;
  dockerfileContent: string | null;
  port: number | null;
  readinessScore: number;
}

export const projectService = {
  getProjects: async (): Promise<Project[]> => {
    const res = await api.get('/projects');
    return res.data.data;
  },

  getProject: async (id: string): Promise<Project> => {
    const res = await api.get(`/projects/${id}`);
    return res.data.data;
  },

  createProject: async (data: Partial<Project>): Promise<Project> => {
    const res = await api.post('/projects', data);
    return res.data.data;
  },

  updateProject: async (id: string, data: Partial<Project>): Promise<Project> => {
    const res = await api.put(`/projects/${id}`, data);
    return res.data.data;
  },

  deleteProject: async (id: string): Promise<void> => {
    await api.delete(`/projects/${id}`);
  },

  async analyzeRepository(data: { githubUrl: string, branch: string }): Promise<AnalysisResult> {
    const response = await api.post('/projects/analyze', data);
    return response.data.data;
  },

  getWebhookConfig: async (id: string): Promise<{ hasWebhookSecret: boolean; autoDeploy: boolean; webhookUrl: string }> => {
    const res = await api.get(`/webhooks/projects/${id}/webhook`);
    return res.data.data;
  },

  generateWebhookSecret: async (id: string): Promise<{ webhookSecret: string; webhookUrl: string }> => {
    const res = await api.post(`/webhooks/projects/${id}/webhook/generate`);
    return res.data.data;
  },

  toggleAutoDeploy: async (id: string, autoDeploy: boolean): Promise<{ autoDeploy: boolean }> => {
    const res = await api.patch(`/webhooks/projects/${id}/webhook/toggle`, { autoDeploy });
    return res.data.data;
  }
};
