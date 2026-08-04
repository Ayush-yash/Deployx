import { Request, Response } from 'express';
import { prisma } from '../db';
import { KubernetesService } from '../services/kubernetes.service';

export class KubernetesController {
  
  static async addCluster(req: Request, res: Response) {
    try {
      const { name, kubeconfig } = req.body;
      const userId = (req as any).user.id;
      
      const cluster = await prisma.kubernetesCluster.create({
        data: {
          name,
          kubeconfig,
          userId
        }
      });
      
      res.json({ success: true, cluster });
    } catch (error: any) {
      console.error('Error adding cluster:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }

  static async autoDiscoverCluster(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const os = await import('os');
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const kubeconfigPath = path.join(os.homedir(), '.kube', 'config');
      try {
        const kubeconfigContent = await fs.readFile(kubeconfigPath, 'utf-8');
        // Extract context name or just use default
        let name = 'Local Kubernetes (auto-discovered)';
        const match = kubeconfigContent.match(/current-context:\s*(.+)/);
        if (match && match[1]) name = match[1].trim();

        // Check if already exists
        const existing = await prisma.kubernetesCluster.findFirst({
          where: { userId, name }
        });
        
        if (existing) {
          return res.json({ success: true, cluster: existing, message: 'Already discovered' });
        }

        const cluster = await prisma.kubernetesCluster.create({
          data: {
            name,
            kubeconfig: kubeconfigContent,
            userId
          }
        });
        
        res.json({ success: true, cluster });
      } catch (e: any) {
        res.status(404).json({ error: 'No local kubeconfig found at ~/.kube/config' });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getClusters(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const clusters = await prisma.kubernetesCluster.findMany({
        where: { userId }
      });
      // Don't send kubeconfig back for security
      const safeClusters = clusters.map(c => ({ id: c.id, name: c.name, createdAt: c.createdAt }));
      res.json(safeClusters);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async addRegistry(req: Request, res: Response) {
    try {
      const { name, registryUrl, username, password } = req.body;
      const userId = (req as any).user.id;

      const registry = await prisma.registryCredential.create({
        data: {
          name, registryUrl, username, password, userId
        }
      });

      res.json({ success: true, registry });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getRegistries(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const registries = await prisma.registryCredential.findMany({
        where: { userId }
      });
      // Omit password
      const safeRegs = registries.map(r => ({ id: r.id, name: r.name, registryUrl: r.registryUrl, username: r.username }));
      res.json(safeRegs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async linkToProject(req: Request, res: Response) {
    try {
      const { projectId, clusterId, registryId } = req.body;
      const userId = (req as any).user.id;

      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project || project.ownerId !== userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      await prisma.project.update({
        where: { id: projectId },
        data: { clusterId, registryId }
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getClusterStatus(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const userId = (req as any).user.id;

      const project = await prisma.project.findUnique({ 
        where: { id: projectId },
        include: { KubernetesCluster: true }
      });

      if (!project || project.ownerId !== userId) return res.status(403).json({ error: 'Unauthorized' });
      if (!project.KubernetesCluster) return res.status(404).json({ error: 'No cluster linked' });

      const k8sService = new KubernetesService(project.KubernetesCluster.kubeconfig);
      
      // Get deployments/pods in default namespace with app=containerName
      // Usually containerName is deployx-container-{deploymentId}
      // For a quick overview, let's just get pods that belong to this project ID
      // But we label them app=deployx-container-...
      // Let's just fetch all pods in default namespace
      const pods = await k8sService.getPods('default', '');
      
      res.json({ pods });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
