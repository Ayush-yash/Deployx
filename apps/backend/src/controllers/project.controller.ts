import { Request, Response } from 'express';
import { prisma } from '../db';
import { encrypt, decrypt } from '../utils/crypto';

import { z } from 'zod';

const projectSchema = z.object({
  name: z.string().min(2),
  githubUrl: z.string().url(),
  branch: z.string().default('main'),
  framework: z.string(),
  port: z.number().optional(),
  environmentVariables: z.record(z.string(), z.string()).optional(),
  description: z.string().optional(),
  language: z.string().optional().nullable(),
  runtime: z.string().optional().nullable(),
  packageManager: z.string().optional().nullable(),
  buildCommand: z.string().optional().nullable(),
  startCommand: z.string().optional().nullable(),
  outputDirectory: z.string().optional().nullable(),
  hasDockerfile: z.boolean().optional().default(false),
  hasDockerCompose: z.boolean().optional().default(false),
  dockerfileContent: z.string().optional().nullable(),
  hasKubernetesManifest: z.boolean().optional().default(false),
  kubernetesManifestContent: z.string().optional().nullable(),
});

export const createProject = async (req: Request, res: Response) => {
  try {
    const validatedData = projectSchema.parse(req.body);
    const userId = (req as any).user.id;

    const githubConnection = await prisma.gitHubConnection.findUnique({ where: { userId } });
    let token = '';
    if (githubConnection) {
      token = githubConnection.accessToken; // encrypted
    } else if (process.env.GITHUB_PAT) {
      token = encrypt(process.env.GITHUB_PAT);
    }

    const envVarsToSave: Record<string, string> = {};
    if (validatedData.environmentVariables) {
      for (const [key, value] of Object.entries(validatedData.environmentVariables)) {
        if (value) envVarsToSave[key] = encrypt(value as string);
      }
    }

    try {
      if (token && validatedData.githubUrl) {
        const match = validatedData.githubUrl.match(/github\.com\/([^/]+)\/([^/.]+)/);
        if (match) {
          const owner = match[1];
          const repo = match[2];
          const { GitHubService } = require('../services/github.service');
          const envData = await GitHubService.fetchEnvExample(token, owner, repo, validatedData.branch);
          for (const [key, value] of Object.entries(envData)) {
            if (!envVarsToSave[key]) {
              const lowerVal = (value as string).toLowerCase();
              // If it's a placeholder, leave it blank. Otherwise, pre-fill it!
              if (lowerVal.includes('your') || lowerVal.includes('enter') || lowerVal.includes('<') || lowerVal === '') {
                envVarsToSave[key] = encrypt(''); 
              } else {
                envVarsToSave[key] = encrypt(value as string);
              }
            }
          }
        }
      }
    } catch (e) {
      // silently ignore github fetch errors
    }

    const project = await prisma.project.create({
      data: {
        ...validatedData,
        port: validatedData.port || null,
        environmentVariables: envVarsToSave,
        ownerId: userId
      }
    });

    const maskedProject = {
      ...project,
      environmentVariables: Object.keys(envVarsToSave).reduce((acc, key) => ({...acc, [key]: '********'}), {})
    };

    res.status(201).json({ success: true, data: maskedProject });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getProjects = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const projects = await prisma.project.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' }
    });

    const maskedProjects = projects.map(p => {
      const masked: Record<string, string> = {};
      if (p.environmentVariables) {
        for (const key of Object.keys(p.environmentVariables as object)) {
          masked[key] = '********';
        }
      }
      return { ...p, environmentVariables: masked };
    });

    res.status(200).json({ success: true, data: maskedProjects });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getProjectById = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const id = req.params.id as string;

    const project = await prisma.project.findUnique({
      where: { id }
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (project.ownerId !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this project' });
    }

    const masked: Record<string, string> = {};
    if (project.environmentVariables) {
      for (const key of Object.keys(project.environmentVariables as object)) {
        masked[key] = '********';
      }
    }
    const maskedProject = { ...project, environmentVariables: masked };

    res.status(200).json({ success: true, data: maskedProject });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateProject = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const validatedData = projectSchema.parse(req.body);

    const existingProject = await prisma.project.findUnique({ where: { id } });

    if (!existingProject) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (existingProject.ownerId !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this project' });
    }

    const envVarsToSave: Record<string, string> = {};
    if (validatedData.environmentVariables) {
      const existingEnv = (existingProject.environmentVariables as Record<string, string>) || {};
      for (const [key, value] of Object.entries(validatedData.environmentVariables)) {
        if (value && value !== '********') {
          envVarsToSave[key] = encrypt(value as string);
        } else if (value === '********' && existingEnv[key]) {
          envVarsToSave[key] = existingEnv[key];
        }
      }
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        ...validatedData,
        port: validatedData.port || null,
        environmentVariables: envVarsToSave,
      }
    });

    const masked: Record<string, string> = {};
    for (const key of Object.keys(envVarsToSave)) {
      masked[key] = '********';
    }
    const maskedProject = { ...updatedProject, environmentVariables: masked };

    res.status(200).json({ success: true, data: maskedProject });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const existingProject = await prisma.project.findUnique({ where: { id } });

    if (!existingProject) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (existingProject.ownerId !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this project' });
    }

    await prisma.project.delete({ where: { id } });

    res.status(200).json({ success: true, message: 'Project deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

import { AnalysisService } from '../services/analysis.service';

export const analyzeRepository = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { githubUrl, branch } = req.body;

    if (!githubUrl || !branch) {
      return res.status(400).json({ success: false, message: 'GitHub URL and branch are required' });
    }

    const githubConnection = await prisma.gitHubConnection.findUnique({
      where: { userId }
    });

    let token = '';
    if (githubConnection) {
      token = decrypt(githubConnection.accessToken);
    } else if (process.env.GITHUB_PAT) {
      token = process.env.GITHUB_PAT;
    } else {
      return res.status(404).json({ success: false, message: 'GitHub account not connected and no fallback PAT provided' });
    }

    const analysisResult = await AnalysisService.analyzeRepository(githubUrl, branch, token);

    res.status(200).json({ success: true, data: analysisResult });
  } catch (error: any) {
    console.error('Analyze Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error during analysis' });
  }
};
