import { Request, Response } from 'express';
import { prisma } from '../db';

export const getAnalyticsSummary = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { startDate, endDate } = req.query;

    const dateFilter: Record<string, any> = {};
    if (startDate && endDate) {
      dateFilter['createdAt'] = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    // Projects owned by user
    const projects = await prisma.project.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true }
    });
    
    const projectIds = projects.map(p => p.id);

    const deployments = await prisma.deployment.findMany({
      where: {
        projectId: { in: projectIds },
        ...dateFilter
      }
    });

    const totalProjects = projects.length;
    const totalDeployments = deployments.length;
    
    let running = 0;
    let stopped = 0;
    let failed = 0;
    let totalDuration = 0;
    let durationCount = 0;

    const statusDist: Record<string, number> = { Running: 0, Stopped: 0, Failed: 0, Queued: 0, Building: 0, Cloning: 0 };
    const projectDeploymentsMap: Record<string, number> = {};
    const deploymentsOverTimeMap: Record<string, number> = {};

    deployments.forEach(d => {
      // Status counts
      if (d.status === 'Running') running++;
      if (d.status === 'Stopped') stopped++;
      if (d.status === 'Failed') failed++;
      
      if (statusDist[d.status] !== undefined) {
        statusDist[d.status] = (statusDist[d.status] || 0) + 1;
      } else {
        statusDist[d.status] = 1;
      }

      // Average Duration
      if (d.duration && d.duration > 0) {
        totalDuration += d.duration;
        durationCount++;
      }

      // Project wise
      if (!d.projectId) return;
      if (!projectDeploymentsMap[d.projectId]) projectDeploymentsMap[d.projectId] = 0;
      projectDeploymentsMap[d.projectId] = (projectDeploymentsMap[d.projectId] || 0) + 1;

      // Over Time (by Day)
      const day = d.createdAt.toISOString().split('T')[0] as string;
      if (!deploymentsOverTimeMap[day]) deploymentsOverTimeMap[day] = 0;
      deploymentsOverTimeMap[day] = (deploymentsOverTimeMap[day] || 0) + 1;
    });

    const successRate = totalDeployments > 0 ? ((running + stopped) / totalDeployments) * 100 : 0;
    const avgDuration = durationCount > 0 ? Math.round(totalDuration / durationCount) : 0;

    // Formatting for Recharts
    const deploymentsOverTime = Object.keys(deploymentsOverTimeMap).sort().map(date => ({
      date,
      count: deploymentsOverTimeMap[date] || 0
    }));

    const projectDeployments = Object.keys(projectDeploymentsMap).map(projectId => {
      const p = projects.find(p => p.id === projectId);
      return {
        projectName: p ? p.name : 'Unknown',
        count: projectDeploymentsMap[projectId] || 0
      };
    }).sort((a, b) => b.count - a.count);

    const statusDistribution = Object.keys(statusDist).filter(k => (statusDist[k] || 0) > 0).map(status => ({
      name: status,
      value: statusDist[status] || 0
    }));

    res.json({
      success: true,
      data: {
        totalProjects,
        totalDeployments,
        runningDeployments: running,
        stoppedDeployments: stopped,
        failedDeployments: failed,
        successRate: successRate.toFixed(1),
        avgDuration,
        deploymentsOverTime,
        projectDeployments,
        statusDistribution,
        topProjects: projectDeployments.slice(0, 5) // Top 5
      }
    });

  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDeploymentHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { status, search } = req.query;

    const whereClause: any = {
      Project: { ownerId: userId }
    };

    if (status && status !== 'All') {
      whereClause.status = status;
    }

    if (search) {
      whereClause.OR = [
        { id: { contains: search as string, mode: 'insensitive' } },
        { Project: { name: { contains: search as string, mode: 'insensitive' } } }
      ];
    }

    const deployments = await prisma.deployment.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to 50 for history table
      include: {
        Project: { select: { name: true, framework: true } }
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
