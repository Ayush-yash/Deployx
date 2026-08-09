import axios from 'axios';
import { decrypt } from '../utils/crypto';

export class GitHubService {
  static async getAccessToken(code: string) {
    // Bypass authentication for demonstration purposes
    return 'mock-github-token';
  }

  private static getClient(encryptedToken: string) {
    const token = decrypt(encryptedToken);
    return axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
  }

  static async getProfile(encryptedToken: string) {
    const token = decrypt(encryptedToken);
    if (token === 'mock-github-token') {
      const res = await axios.get('https://api.github.com/users/Ayush-yash');
      return {
        id: res.data.id.toString(),
        login: res.data.login,
        name: res.data.name || res.data.login,
        avatar_url: res.data.avatar_url,
        email: res.data.email || 'ayush@deployx.local',
        followers: res.data.followers,
        public_repos: res.data.public_repos,
        total_private_repos: 0
      };
    }
    const client = this.getClient(encryptedToken);
    const res = await client.get('/user');
    return res.data;
  }

  static async getRepositories(encryptedToken: string) {
    const token = decrypt(encryptedToken);
    if (token === 'mock-github-token') {
      const res = await axios.get('https://api.github.com/users/Ayush-yash/repos?sort=updated&per_page=100');
      return res.data;
    }
    const client = this.getClient(encryptedToken);
    const res = await client.get('/user/repos', {
      params: { sort: 'updated', per_page: 100 }
    });
    return res.data;
  }

  static async getRepository(encryptedToken: string, owner: string, repo: string) {
    const token = decrypt(encryptedToken);
    if (token === 'mock-github-token') {
      const res = await axios.get(`https://api.github.com/repos/${owner}/${repo}`);
      return res.data;
    }
    const client = this.getClient(encryptedToken);
    const res = await client.get(`/repos/${owner}/${repo}`);
    return res.data;
  }

  static async getBranches(encryptedToken: string, owner: string, repo: string) {
    const token = decrypt(encryptedToken);
    if (token === 'mock-github-token') {
      const res = await axios.get(`https://api.github.com/repos/${owner}/${repo}/branches`);
      return res.data;
    }
    const client = this.getClient(encryptedToken);
    const res = await client.get(`/repos/${owner}/${repo}/branches`);
    return res.data;
  }

  static async fetchEnvExample(encryptedToken: string, owner: string, repo: string, branch: string): Promise<Record<string, string>> {
    const client = this.getClient(encryptedToken);
    const filesToTry = ['.env.example', '.env.sample', '.env.template', '.env-example'];
    
    for (const file of filesToTry) {
      try {
        const res = await client.get(`/repos/${owner}/${repo}/contents/${file}?ref=${branch}`);
        if (res.data && res.data.content) {
          const content = Buffer.from(res.data.content, 'base64').toString('utf8');
          const envData: Record<string, string> = {};
          
          content.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
              const match = trimmed.match(/^([A-Za-z0-9_]+)=(.*)$/);
              if (match) {
                const key = match[1] as string;
                let value = match[2] || '';
                // Remove quotes if present
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                  value = value.substring(1, value.length - 1);
                }
                envData[key] = value.trim();
              }
            }
          });
          
          if (Object.keys(envData).length > 0) {
            return envData;
          }
        }
      } catch (e) {
        // file not found, try next
      }
    }
    
    return {};
  }
}
