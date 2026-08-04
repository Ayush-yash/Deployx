import axios from 'axios';
import { decrypt } from '../utils/crypto';

export class GitHubService {
  static async getAccessToken(code: string) {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('GitHub OAuth is not configured correctly on the backend.');
    }

    const response = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: clientId,
        client_secret: clientSecret,
        code,
      },
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

    if (response.data.error) {
      throw new Error(response.data.error_description || response.data.error);
    }

    return response.data.access_token;
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
    const client = this.getClient(encryptedToken);
    const res = await client.get('/user');
    return res.data;
  }

  static async getRepositories(encryptedToken: string) {
    const client = this.getClient(encryptedToken);
    const res = await client.get('/user/repos', {
      params: {
        sort: 'updated',
        per_page: 100
      }
    });
    return res.data;
  }

  static async getRepository(encryptedToken: string, owner: string, repo: string) {
    const client = this.getClient(encryptedToken);
    const res = await client.get(`/repos/${owner}/${repo}`);
    return res.data;
  }

  static async getBranches(encryptedToken: string, owner: string, repo: string) {
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
                const key = match[1];
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
    
    return [];
  }
}
