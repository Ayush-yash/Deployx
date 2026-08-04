import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { DeploymentService } from './services/deployment.service';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/deployx';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  const user = await prisma.user.findUnique({ where: { email: 'qeiwpk2426@minitts.net' } });
  if (!user) {
    console.error('No users found in database');
    process.exit(1);
  }

  // A very simple nodejs public repo
  const repoUrl = 'https://github.com/heroku/node-js-getting-started';

  console.log('Creating test project for user:', user.email);

  const project = await prisma.project.create({
    data: {
      name: 'test-auto-deploy-' + Date.now(),
      githubUrl: repoUrl,
      branch: 'main',
      status: 'Active',
      ownerId: user.id,
      framework: 'Node.js'
    }
  });

  console.log('Project created:', project.id);

  const deployment = await prisma.deployment.create({
    data: {
      projectId: project.id,
      status: 'Queued',
      version: 1,
      branch: 'main'
    }
  });

  console.log('Deployment created:', deployment.id);
  console.log('Starting deployment via service...');

  // This will run everything: clone, nixpacks build, docker run, etc.
  try {
    await DeploymentService.startDeployment(deployment.id, project.id, user.id);
    console.log('Deployment completed successfully!');
  } catch (error) {
    console.error('Deployment failed:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

run();
