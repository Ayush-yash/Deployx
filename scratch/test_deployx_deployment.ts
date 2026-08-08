import { prisma } from '../apps/backend/src/db';
import { DeploymentService } from '../apps/backend/src/services/deployment.service';

async function main() {
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: 'demo@deployx.com' }, { email: 'ayushyash.org@gmail.com' }] }
  });

  if (!user) {
    console.error('No user found');
    return;
  }

  console.log('Using user:', user.email, user.id);

  // Find or create Deployx project for this user
  let project = await prisma.project.findFirst({
    where: { ownerId: user.id, githubUrl: 'https://github.com/Ayush-yash/Deployx' }
  });

  if (!project) {
    console.log('Creating Deployx project for user...');
    project = await prisma.project.create({
      data: {
        name: 'Deployx',
        githubUrl: 'https://github.com/Ayush-yash/Deployx',
        branch: 'main',
        framework: 'React (Vite)', // Deploying the Frontend/SPA app of Deployx
        port: 80,
        ownerId: user.id,
        status: 'Draft',
        buildCommand: 'npm run build',
        startCommand: 'npm run dev'
      }
    });
  }

  console.log('Deploying project:', project.name, project.id);

  const lastDeployment = await prisma.deployment.findFirst({
    where: { projectId: project.id },
    orderBy: { version: 'desc' }
  });

  const nextVersion = lastDeployment ? lastDeployment.version + 1 : 1;

  const deployment = await prisma.deployment.create({
    data: {
      projectId: project.id,
      status: 'Queued',
      branch: project.branch,
      framework: project.framework,
      version: nextVersion,
      commitMessage: 'Automated Deployx self-deployment test',
      authorName: 'Deployx Assistant'
    }
  });

  console.log(`Starting Deployment ID: ${deployment.id} (v${nextVersion})...`);
  
  await DeploymentService.startDeployment(deployment.id, project.id, user.id);
  console.log('Deployment completed successfully!');
}

main().catch(err => {
  console.error('Deployment test failed:', err);
  process.exit(1);
});
