import { Request, Response } from 'express';
import { prisma } from '../db';
import { DeploymentService } from '../services/deployment.service';

export const deployProject = async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId as string;
    const userId = req.user!.id;

    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: userId }
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const lastDeployment = await prisma.deployment.findFirst({
      where: { projectId },
      orderBy: { version: 'desc' }
    });

    const nextVersion = lastDeployment ? lastDeployment.version + 1 : 1;

    const { commitHash, commitMessage, authorName } = req.body;

    const deployment = await prisma.deployment.create({
      data: {
        projectId,
        status: 'Queued',
        branch: project.branch,
        framework: project.framework,
        version: nextVersion,
        commitHash: commitHash || null,
        commitMessage: commitMessage || null,
        authorName: authorName || null,
      }
    });

    // Start asynchronously
    DeploymentService.startDeployment(deployment.id, projectId, userId).catch(err => {
      console.error('Async deployment failed completely:', err);
    });

    res.json({ success: true, data: { deploymentId: deployment.id, version: nextVersion } });
  } catch (error: any) {
    console.error('deployProject error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDeploymentLogs = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;

    const deployment = await prisma.deployment.findFirst({
      where: { id, Project: { ownerId: userId } }
    });

    if (!deployment) {
      return res.status(404).json({ success: false, message: 'Deployment not found' });
    }

    if (!deployment.logFile) {
      return res.json({ success: true, data: 'No historical logs available for this deployment.' });
    }

    const fs = await import('fs/promises');
    try {
      const logs = await fs.readFile(deployment.logFile, 'utf-8');
      res.json({ success: true, data: logs });
    } catch (e) {
      res.json({ success: true, data: 'Logs file could not be read or has been deleted.' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDeployments = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const deployments = await prisma.deployment.findMany({
      where: {
        Project: { ownerId: userId }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        Project: { select: { name: true } }
      }
    });

    const mappedDeployments = deployments.map((d: any) => ({
      ...d,
      project: d.Project
    }));

    res.json({ success: true, data: mappedDeployments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDeployment = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;

    const deployment = await prisma.deployment.findFirst({
      where: { id, Project: { ownerId: userId } },
      include: { Project: true }
    });

    if (!deployment) {
      return res.status(404).json({ success: false, message: 'Deployment not found' });
    }

    const mappedDeployment = {
      ...deployment,
      project: (deployment as any).Project
    };

    res.json({ success: true, data: mappedDeployment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const stopDeployment = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;
    await DeploymentService.stopDeployment(id, userId);
    res.json({ success: true, data: { status: 'Stopped' } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const startDeployment = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;
    await DeploymentService.startExistingDeployment(id, userId);
    res.json({ success: true, data: { status: 'Running' } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteDeployment = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;
    await DeploymentService.deleteDeployment(id, userId);
    res.json({ success: true, data: null });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
