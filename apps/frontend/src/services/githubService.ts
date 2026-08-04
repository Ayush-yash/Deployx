import { api } from '../contexts/AuthContext';

export interface GitHubProfile {
  id: string;
  githubId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
  followers?: number;
  following?: number;
  public_repos?: number;
  total_private_repos?: number;
  connectedAt: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count?: number;
  default_branch: string;
  updated_at: string;
  created_at?: string;
  clone_url?: string;
  html_url?: string;
  owner?: {
    login: string;
    avatar_url: string;
  };
}

export interface GitHubBranch {
  name: string;
  protected: boolean;
  commit: {
    sha: string;
  };
}

export const githubService = {
  getAuthUrl: async (): Promise<{ url: string }> => {
    const res = await api.get('/github/auth-url');
    return res.data.data;
  },

  connectCallback: async (code: string): Promise<{ connected: boolean }> => {
    const res = await api.post('/github/callback', { code });
    return res.data.data;
  },

  getProfile: async (): Promise<GitHubProfile> => {
    const res = await api.get('/github/profile');
    return res.data.data;
  },

  disconnect: async (): Promise<void> => {
    await api.delete('/github/disconnect');
  },

  getRepositories: async (): Promise<GitHubRepository[]> => {
    const res = await api.get('/github/repositories');
    return res.data.data;
  },

  getRepositoryDetails: async (owner: string, repo: string): Promise<GitHubRepository> => {
    const res = await api.get(`/github/repositories/${owner}/${repo}`);
    return res.data.data;
  },

  getBranches: async (owner: string, repo: string): Promise<GitHubBranch[]> => {
    const res = await api.get(`/github/repositories/${owner}/${repo}/branches`);
    return res.data.data;
  }
};
