import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { DeploymentService } from '../services/deployment.service';
import { prisma } from '../db';

function verifyGitHubSignature(payload: Buffer, secret: string, signature: string): boolean {
  const expectedSig = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
  } catch {
    return false;
  }
}

export const handleGitHubWebhook = async (req: Request, res: Response) => {
  try {
    const event = req.headers['x-github-event'] as string;
    const signature = req.headers['x-hub-signature-256'] as string;
    const rawBody: Buffer = (req as any).rawBody;

    // Only handle push events
    if (event !== 'push') {
      return res.status(200).json({ message: `Ignoring event: ${event}` });
    }

    const payload = req.body;
    const repoUrl = payload.repository?.html_url as string;
    const pushedRef = payload.ref as string; // e.g. "refs/heads/main"
    const pushedBranch = pushedRef?.replace('refs/heads/', '');
    const headCommit = payload.head_commit;

    if (!repoUrl || !pushedBranch) {
      return res.status(400).json({ message: 'Invalid webhook payload' });
    }

    // Normalize URL variants (with or without .git suffix)
    const normalizedRepoUrl = repoUrl.replace(/\.git$/, '');

    // Find projects matching this repo + branch with autoDeploy enabled
    const projects = await prisma.project.findMany({
      where: {
        autoDeploy: true,
        branch: pushedBranch,
      },
      include: { User: true }
    });

    const matchingProjects = projects.filter(p => {
      const normalizedProjectUrl = p.githubUrl.replace(/\.git$/, '');
      return normalizedProjectUrl === normalizedRepoUrl;
    });

    if (matchingProjects.length === 0) {
      return res.status(200).json({ message: 'No matching projects with autoDeploy enabled' });
    }

    // Validate signature against each matching project's webhookSecret
    for (const project of matchingProjects) {
      if (project.webhookSecret) {
        if (!signature || !rawBody) {
          console.warn(`[Webhook] No signature or raw body for project ${project.id}`);
          continue;
        }
        const isValid = verifyGitHubSignature(rawBody, project.webhookSecret, signature);
        if (!isValid) {
          console.warn(`[Webhook] Invalid signature for project ${project.id}`);
          continue;
        }
      }

      // Create a deployment record
      const deployment = await prisma.deployment.create({
        data: {
          projectId: project.id,
          status: 'Queued',
          branch: pushedBranch,
          framework: project.framework,
          commitHash: headCommit?.id?.slice(0, 7) || null,
          commitMessage: headCommit?.message || null,
          authorName: headCommit?.author?.name || null,
          progressPercentage: 0,
        }
      });

      // Fire & forget — run deployment in background
      DeploymentService.startDeployment(deployment.id, project.id, project.ownerId).catch(err => {
        console.error(`[Webhook] Auto-deploy failed for project ${project.id}:`, err);
      });

      console.log(`[Webhook] Auto-deployment triggered for project ${project.name} (${project.id}), deployment ${deployment.id}`);
    }

    res.status(200).json({ message: 'Webhook processed', triggeredCount: matchingProjects.length });
  } catch (error: any) {
    console.error('[Webhook] Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const generateWebhookSecret = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const project = await prisma.project.findUnique({ where: { id } });

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (project.ownerId !== userId) return res.status(403).json({ success: false, message: 'Forbidden' });

    const secret = crypto.randomBytes(32).toString('hex');

    await prisma.project.update({
      where: { id },
      data: { webhookSecret: secret }
    });

    // Only return secret once
    res.status(200).json({
      success: true,
      data: {
        webhookSecret: secret,
        webhookUrl: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/webhooks/github`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const toggleAutoDeploy = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const id = req.params.id as string;
    const { autoDeploy } = req.body;

    const project = await prisma.project.findUnique({ where: { id } });

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (project.ownerId !== userId) return res.status(403).json({ success: false, message: 'Forbidden' });

    const updated = await prisma.project.update({
      where: { id },
      data: { autoDeploy: Boolean(autoDeploy) }
    });

    res.status(200).json({ success: true, data: { autoDeploy: updated.autoDeploy } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getWebhookConfig = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const id = req.params.id as string;

    const project = await prisma.project.findUnique({ where: { id } });

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (project.ownerId !== userId) return res.status(403).json({ success: false, message: 'Forbidden' });

    res.status(200).json({
      success: true,
      data: {
        hasWebhookSecret: !!project.webhookSecret,
        autoDeploy: project.autoDeploy,
        webhookUrl: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/webhooks/github`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
