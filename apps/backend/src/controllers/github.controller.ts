import { Request, Response } from 'express';
import { encrypt, decrypt } from '../utils/crypto';
import { GitHubService } from '../services/github.service';
import crypto from 'crypto';
import { prisma } from '../db';

export const getAuthUrl = async (req: Request, res: Response) => {
  try {
    const clientId = process.env.GITHUB_CLIENT_ID || 'dummy_client_id';
    const state = crypto.randomBytes(16).toString('hex');
    
    const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&state=${state}&scope=read:user user:email repo&prompt=consent`;
    
    res.json({ success: true, data: { url } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const handleCallback = async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    const userId = req.user!.id;

    if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
      return res.status(400).json({ success: false, message: 'GitHub OAuth is not configured on the backend.' });
    }

    const accessToken = await GitHubService.getAccessToken(code as string);
    const profile = await GitHubService.getProfile(encrypt(accessToken));
    
    const encryptedToken = encrypt(accessToken);

    await prisma.gitHubConnection.upsert({
      where: { userId },
      update: {
        accessToken: encryptedToken,
        githubId: profile.id.toString(),
        username: profile.login,
      },
      create: {
        userId,
        accessToken: encryptedToken,
        githubId: profile.id.toString(),
        username: profile.login,
      }
    });

    res.json({ success: true, message: 'GitHub connected successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to authenticate with GitHub' });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const conn = await prisma.gitHubConnection.findUnique({ where: { userId: req.user!.id } });
    if (!conn) {
      return res.status(404).json({ success: false, message: 'GitHub account not connected' });
    }

    const liveProfile = await GitHubService.getProfile(conn.accessToken);
    res.json({ 
      success: true, 
      data: { 
        ...conn, 
        username: liveProfile.login || conn.username,
        displayName: liveProfile.name || conn.displayName,
        avatarUrl: liveProfile.avatar_url || conn.avatarUrl,
        email: liveProfile.email || conn.email,
        followers: liveProfile.followers,
        public_repos: liveProfile.public_repos,
        total_private_repos: liveProfile.total_private_repos
      } 
    });
  } catch (error: any) {
    if (error.response?.status === 401) {
      await prisma.gitHubConnection.delete({ where: { userId: req.user!.id } });
      return res.status(401).json({ success: false, message: 'GitHub account not connected or token expired.' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

export const disconnect = async (req: Request, res: Response) => {
  try {
    await prisma.gitHubConnection.deleteMany({ where: { userId: req.user!.id } });
    res.json({ success: true, data: null });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getRepositories = async (req: Request, res: Response) => {
  try {
    const conn = await prisma.gitHubConnection.findUnique({ where: { userId: req.user!.id } });
    if (!conn) return res.status(404).json({ success: false, message: 'GitHub account not connected' });

    const repos = await GitHubService.getRepositories(conn.accessToken);
    res.json({ success: true, data: repos });
  } catch (error: any) {
    if (error.response?.status === 401) {
      await prisma.gitHubConnection.delete({ where: { userId: req.user!.id } });
      return res.status(401).json({ success: false, message: 'GitHub account not connected or token expired.' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getRepositoryDetails = async (req: Request, res: Response) => {
  try {
    const owner = req.params.owner as string;
    const repo = req.params.repo as string;
    const conn = await prisma.gitHubConnection.findUnique({ where: { userId: req.user!.id } });
    if (!conn) return res.status(404).json({ success: false, message: 'GitHub account not connected' });

    const details = await GitHubService.getRepository(conn.accessToken, owner, repo);
    res.json({ success: true, data: details });
  } catch (error: any) {
    if (error.response?.status === 401) {
      await prisma.gitHubConnection.delete({ where: { userId: req.user!.id } });
      return res.status(401).json({ success: false, message: 'GitHub account not connected or token expired.' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBranches = async (req: Request, res: Response) => {
  try {
    const owner = req.params.owner as string;
    const repo = req.params.repo as string;
    const conn = await prisma.gitHubConnection.findUnique({ where: { userId: req.user!.id } });
    if (!conn) return res.status(404).json({ success: false, message: 'GitHub account not connected' });

    const branches = await GitHubService.getBranches(conn.accessToken, owner, repo);
    res.json({ success: true, data: branches });
  } catch (error: any) {
    if (error.response?.status === 401) {
      await prisma.gitHubConnection.delete({ where: { userId: req.user!.id } });
      return res.status(401).json({ success: false, message: 'GitHub account not connected or token expired.' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};
