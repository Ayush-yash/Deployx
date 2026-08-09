import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as net from 'net';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { decrypt } from '../utils/crypto';
import { emitDeploymentEvent, emitToUser } from '../socket';
import { NotificationService } from './notification.service';
import { PortAllocationService } from './port-allocation.service';
import { Tunnel } from 'cloudflared';
import localtunnel from 'localtunnel';
import { KubernetesService } from './kubernetes.service';
import { prisma } from '../db';

const execAsync = promisify(exec);

export const activeTunnels = new Map<string, any>();

export function closeTunnel(tunnel: any) {
  if (!tunnel) return;
  try {
    if (typeof tunnel.close === 'function') {
      tunnel.close();
    } else if (typeof tunnel.stop === 'function') {
      tunnel.stop();
    } else if (typeof tunnel.kill === 'function') {
      tunnel.kill();
    }
  } catch (e) {
    // Ignore cleanup errors
  }
}

async function provisionPublicTunnel(
  port: number,
  projectName: string,
  projectId: string,
  deploymentId: string,
  decryptedEnvs: Record<string, string>,
  emitLog: (type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR', msg: string) => void
): Promise<string> {
  // Clean up any existing tunnel for this deployment
  const existingTunnel = activeTunnels.get(deploymentId);
  if (existingTunnel) {
    closeTunnel(existingTunnel);
    activeTunnels.delete(deploymentId);
  }

  // 1. Permanent Cloudflare Tunnel Token (if token is provided in env)
  const cfToken = decryptedEnvs['CLOUDFLARE_TUNNEL_TOKEN'] || process.env.CLOUDFLARE_TUNNEL_TOKEN;
  if (cfToken) {
    emitLog('INFO', 'Provisioning permanent public URL using Cloudflare Tunnel Token...');
    try {
      const cfProc = spawn('cloudflared', ['tunnel', 'run', '--token', cfToken], { shell: true });
      activeTunnels.set(deploymentId, cfProc);
      const customDomain = decryptedEnvs['CLOUDFLARE_DOMAIN'] || process.env.CLOUDFLARE_DOMAIN;
      if (customDomain) {
        const fullUrl = customDomain.startsWith('http') ? customDomain : `https://${customDomain}`;
        emitLog('SUCCESS', `Permanent Cloudflare Domain ready: ${fullUrl}`);
        return fullUrl;
      }
    } catch (e) {
      emitLog('WARNING', `Cloudflare Tunnel Token failed, falling back to localtunnel...`);
    }
  }

  // 2. Fixed Permanent Subdomain via LocalTunnel (Zero-config permanent URL)
  // Subdomain is deterministically generated from Project Name & ID so it NEVER changes on redeploy or restart!
  const cleanName = projectName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
  const fixedSubdomain = `deployx-${cleanName}-${projectId.slice(0, 5)}`;
  
  try {
    emitLog('INFO', `Provisioning permanent URL with fixed subdomain (${fixedSubdomain})...`);
    const lt = await localtunnel({ port, subdomain: fixedSubdomain, local_host: '127.0.0.1' });
    activeTunnels.set(deploymentId, lt);
    
    lt.on('close', () => {
      activeTunnels.delete(deploymentId);
    });

    if (lt.url) {
      emitLog('SUCCESS', `Permanent Public URL ready: ${lt.url}`);
      return lt.url;
    }
  } catch (err: any) {
    emitLog('WARNING', `Fixed subdomain busy or unavailable. Trying Cloudflare quick tunnel...`);
  }

  // 3. Fallback: Cloudflare Quick Tunnel
  emitLog('INFO', 'Provisioning public URL via Cloudflare Quick Tunnel...');
  const tunnel = Tunnel.quick(`localhost:${port}`);
  activeTunnels.set(deploymentId, tunnel);

  const publicUrl = await new Promise((resolve, reject) => {
    tunnel.once('url', resolve);
    tunnel.once('error', reject);
    setTimeout(() => reject(new Error('Timeout waiting for tunnel URL')), 15000);
  }) as string;

  tunnel.on('exit', () => {
    activeTunnels.delete(deploymentId);
  });

  emitLog('SUCCESS', `Public URL ready: ${publicUrl}`);
  return publicUrl;
}

export class DeploymentService {
  static async startDeployment(deploymentId: string, projectId: string, userId: string) {
    let workspace = '';
    
    let currentStepName = 'Initializing';
    let currentPercent = 0;
    let completedSteps = 0;
    const totalSteps = 6;
    const startTime = Date.now();

    const statsInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = currentPercent > 0 ? Math.floor((elapsed / currentPercent) * (100 - currentPercent)) : 120;
        
        emitDeploymentEvent(deploymentId, 'deployment:stats', {
            elapsed,
            remaining,
            currentStep: currentStepName,
            completedSteps,
            totalSteps,
            percentage: currentPercent
        });
    }, 1000);

    const updateProgress = async (step: string, percent: number, isCompletedStep = false) => {
      currentStepName = step;
      currentPercent = percent;
      if (isCompletedStep) completedSteps++;
      
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { currentStep: step, progressPercentage: percent }
      }).catch(() => {});
      
      emitDeploymentEvent(deploymentId, 'deployment:progress', { step, percentage: percent });
      
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = currentPercent > 0 ? Math.floor((elapsed / currentPercent) * (100 - currentPercent)) : 120;
      emitDeploymentEvent(deploymentId, 'deployment:stats', {
         elapsed,
         remaining,
         currentStep: currentStepName,
         completedSteps,
         totalSteps,
         percentage: currentPercent
      });
    };

    let logFilePath = '';
    let logFileHandle: fs.FileHandle | null = null;
    try {
      const logDir = path.join(process.cwd(), 'logs', 'deployments');
      await fs.mkdir(logDir, { recursive: true });
      logFilePath = path.join(logDir, `${deploymentId}.log`);
      logFileHandle = await fs.open(logFilePath, 'a');

      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { logFile: logFilePath }
      });
    } catch (e) {
      console.error('Failed to setup log file:', e);
    }

    const emitLog = (level: string, message: string) => {
      const timestamp = new Date().toISOString();
      emitDeploymentEvent(deploymentId, 'deployment:log', { timestamp, level, message });
      if (logFileHandle) {
        logFileHandle.write(`[${timestamp}] [${level}] ${message}\n`).catch(() => {});
      }
    };

    const streamCommand = (command: string, envOverrides?: Record<string, string>): Promise<string> => {
      return new Promise((resolve, reject) => {
        const child = spawn(command, { shell: true, env: { ...process.env, GIT_TERMINAL_PROMPT: '0', ...envOverrides } });
        let fullOutput = '';
        
        child.stdout.on('data', (data: Buffer) => {
          const str = data.toString();
          fullOutput += str;
          // Emit each line or chunk to frontend
          str.split('\n').forEach(line => {
            if (line.trim()) emitLog('OUTPUT', line.trim());
          });
        });
        
        child.stderr.on('data', (data: Buffer) => {
          const str = data.toString();
          fullOutput += str;
          str.split('\n').forEach(line => {
            if (line.trim()) emitLog('OUTPUT', line.trim());
          });
        });
        
        child.on('close', (code) => {
          if (code === 0) {
            resolve(fullOutput);
          } else {
            const errorSnippet = fullOutput.slice(-1000);
            reject(new Error(`Command failed with code ${code}. Output: ${errorSnippet}`));
          }
        });

        child.on('error', (err) => {
          reject(err);
        });
      });
    };

    try {
      emitLog('SYSTEM', 'Starting deployment process...');
      await updateProgress('Initializing', 5, true);

      const project = await prisma.project.findUnique({ 
        where: { id: projectId },
        include: { Deployment: true, KubernetesCluster: true, RegistryCredential: true }
      });
      const githubConn = await prisma.gitHubConnection.findUnique({ where: { userId } });

      if (!project) {
        throw new Error('Project not found');
      }

      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { status: 'Cloning' }
      });
      emitDeploymentEvent(deploymentId, 'deployment:status', { status: 'Cloning' });

      await updateProgress('Repository Cloning', 10);
      
      // Simulate cloning progress (10% -> 19%)
      let clonePercent = 10;
      const cloneInterval = setInterval(async () => {
        if (clonePercent < 19) {
          clonePercent += 2;
          await updateProgress('Repository Cloning', clonePercent);
        }
      }, 500);

      emitLog('INFO', `Cloning branch ${project.branch} from repository...`);

      let authRepoUrl = project.githubUrl;
      if (githubConn) {
        const token = decrypt(githubConn.accessToken);
        authRepoUrl = project.githubUrl.replace('https://', `https://${token}@`);
      }

      // Use os.tmpdir() for cross-platform support (windows safe)
      workspace = path.join(os.tmpdir(), 'deployx', `${projectId}_${deploymentId}`);
      await fs.mkdir(workspace, { recursive: true });

      // Step: Clone
      try {
        const depRecord = await prisma.deployment.findUnique({ where: { id: deploymentId } });
        if (depRecord?.commitHash) {
          emitLog('INFO', `Performing rollback/specific deploy. Checking out commit: ${depRecord.commitHash}`);
          await streamCommand(`git clone --branch ${project.branch} ${authRepoUrl} ${workspace}`);
          await streamCommand(`git -C "${workspace}" checkout ${depRecord.commitHash}`);
        } else {
          await streamCommand(`git clone --depth 1 --branch ${project.branch} --single-branch ${authRepoUrl} ${workspace}`);
        }
        emitLog('SUCCESS', 'Repository cloned successfully.');
        await updateProgress('Repository Cloned', 20, true);
      } finally {
        clearInterval(cloneInterval);
      }
      
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { status: 'Building' }
      });
      emitDeploymentEvent(deploymentId, 'deployment:status', { status: 'Building' });
      
      await updateProgress('Framework Detection', 30, true);
      emitLog('INFO', `Detecting framework... Framework selected: ${project.framework || 'Auto'}`);

      // --- Vite Project Validation ---
      try {
        const indexHtmlPath = path.join(workspace, 'index.html');
        const indexHtmlStats = await fs.stat(indexHtmlPath).catch(() => null);
        
        if (indexHtmlStats && indexHtmlStats.isFile()) {
          emitLog('INFO', 'Validating Vite project structure...');
          let htmlContent = await fs.readFile(indexHtmlPath, 'utf8');
          
          const scriptRegex = /<script\s+([^>]+)>/gi;
          let match;
          
          while ((match = scriptRegex.exec(htmlContent)) !== null) {
            const attrs = match[1] as string;
            if (attrs && (attrs.includes('type="module"') || attrs.includes("type='module'"))) {
              const srcMatch = attrs.match(/src=["']([^"']+)["']/);
              if (srcMatch && srcMatch[1]) {
                const originalSrc = srcMatch[1] as string;
                if (originalSrc.startsWith('http://') || originalSrc.startsWith('https://') || originalSrc.startsWith('//')) {
                  continue;
                }
                const normalizedSrcPath = originalSrc.startsWith('/') ? originalSrc.substring(1) : originalSrc;
                const absoluteSrcPath = path.join(workspace, ...normalizedSrcPath.split('/'));
                
                const srcExists = await fs.stat(absoluteSrcPath).catch(() => null);
                
                if (!srcExists) {
                  emitLog('WARNING', `Referenced entry file not found: ${originalSrc}`);
                  
                  const candidates = [
                    'src/main.tsx', 'src/main.jsx', 'src/main.ts', 'src/main.js',
                    'src/index.tsx', 'src/index.jsx', 'src/index.ts', 'src/index.js',
                    'main.tsx', 'main.jsx', 'main.ts', 'main.js',
                    'index.tsx', 'index.jsx', 'index.ts', 'index.js',
                    'src/App.tsx', 'src/App.jsx', 'src/App.ts', 'src/App.js',
                    'App.tsx', 'App.jsx', 'App.ts', 'App.js'
                  ];
                  const existingCandidates: string[] = [];
                  
                  for (const candidate of candidates) {
                    const candidatePath = path.join(workspace, ...candidate.split('/'));
                    const candidateStats = await fs.stat(candidatePath).catch(() => null);
                    if (candidateStats && candidateStats.isFile()) {
                      existingCandidates.push(candidate);
                    }
                  }
                  
                  if (existingCandidates.length === 1) {
                    const newSrc = `/${existingCandidates[0]}`;
                    emitLog('INFO', `Original entry: ${originalSrc}`);
                    emitLog('INFO', `Detected file: ${newSrc}`);
                    emitLog('INFO', `Updated entry: ${newSrc}`);
                    htmlContent = htmlContent.replace(originalSrc, newSrc);
                    await fs.writeFile(indexHtmlPath, htmlContent);
                    emitLog('SUCCESS', 'Vite entry file corrected.');
                  } else if (existingCandidates.length > 1) {
                    emitLog('ERROR', 'Multiple Vite entry file candidates found: ' + existingCandidates.join(', '));
                    emitLog('ERROR', 'Please choose the exact entry file in index.html.');
                    throw new Error('Multiple Vite entry files found.');
                  } else {
                    emitLog('WARNING', 'Vite entry file not found. Creating a placeholder entry file to prevent build failure...');
                    const pkgJsonPath = path.join(workspace, 'package.json');
                    const hasReact = await fs.readFile(pkgJsonPath, 'utf8')
                      .then(content => content.includes('"react"'))
                      .catch(() => false);

                    await fs.mkdir(path.join(workspace, 'src'), { recursive: true }).catch(() => {});
                    const placeholderPath = path.join(workspace, 'src', 'main.tsx');

                    if (hasReact) {
                      await fs.writeFile(placeholderPath, `
import React from 'react';
import ReactDOM from 'react-dom/client';

const App = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    fontFamily: 'sans-serif',
    background: '#0f172a',
    color: '#f8fafc',
    padding: '20px',
    textAlign: 'center'
  }}>
    <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>DeployX Placeholder</h1>
    <p style={{ color: '#94a3b8' }}>This project was deployed successfully, but the source code (src/ folder) is missing from your repository.</p>
  </div>
);

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(<App />);
}
                      `);
                    } else {
                      await fs.writeFile(placeholderPath, `
document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('root') || document.body;
  root.innerHTML = \`
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 20px; text-align: center;">
      <h1 style="font-size: 2.5rem; margin-bottom: 1rem;">DeployX Placeholder</h1>
      <p style="color: #94a3b8;">This project was deployed successfully, but the source code (src/ folder) is missing from your repository.</p>
    </div>
  \`;
});
                      `);
                    }

                    htmlContent = htmlContent.replace(originalSrc, '/src/main.tsx');
                    await fs.writeFile(indexHtmlPath, htmlContent);
                    emitLog('SUCCESS', 'Created placeholder src/main.tsx and patched index.html.');
                  }
                } else {
                  emitLog('SUCCESS', 'Vite entry file validated.');
                }
              }
            }
          }
        }
      } catch (e: any) {
        if (e.message.includes('Vite entry file not found')) {
          throw e;
        }
      }
      // -----------------------------------------------------

      // Setup Dockerfile if provided via DeployX UI overrides
      const dockerfilePath = path.join(workspace, 'Dockerfile');
      if (project.dockerfileContent && !project.dockerfileContent.includes('FROM node:20-alpine AS builder') && !project.dockerfileContent.includes('FROM node:20-alpine\nWORKDIR')) {
        emitLog('INFO', 'Writing custom project Dockerfile configuration from DeployX UI...');
        await fs.writeFile(dockerfilePath, project.dockerfileContent);
        emitLog('SUCCESS', 'Custom Dockerfile configured.');
      }

      // We no longer generate a generic fallback Dockerfile. Nixpacks handles it!

      // Ensure a proper .dockerignore exists to prevent excluding critical source files (like src/)
      const dockerignorePath = path.join(workspace, '.dockerignore');
      const standardDockerignore = `node_modules\n.git\n.github\n.env\n.env.*\n!.env.example\ndist\nbuild\n.next\ncoverage\n`;
      emitLog('INFO', 'Configuring .dockerignore to ensure all required source files are copied...');
      await fs.writeFile(dockerignorePath, standardDockerignore);

      let imageName = `deployx-project-${project.id.toLowerCase()}`;
      const containerName = `deployx-container-${deploymentId}`;

      await updateProgress('Building Image', 40);
      emitLog('INFO', `Building image using Nixpacks: ${imageName}... This may take a few minutes.`);

      // Simulate build progress (40% -> 84%)
      let buildPercent = 40;
      const buildInterval = setInterval(async () => {
        if (buildPercent < 84) {
          buildPercent += 1;
          await updateProgress('Building Image', buildPercent);
        }
      }, 2000);

      // NEW DOCKER VALIDATION LOGIC
      emitLog('INFO', 'Checking Docker availability...');
      try {
        await streamCommand('docker --version');
        emitLog('SUCCESS', 'Docker OK');
      } catch (err) {
        emitLog('ERROR', 'Docker is not installed.');
        clearInterval(buildInterval);
        throw new Error('Docker is not installed.');
      }

      emitLog('INFO', 'Checking Docker daemon...');
      try {
        await streamCommand('docker info');
        emitLog('SUCCESS', 'Daemon Running');
      } catch (err) {
        emitLog('ERROR', 'Docker Desktop is not running.');
        clearInterval(buildInterval);
        throw new Error('Docker Desktop is not running.');
      }

      let buildKitEnabled = 'Enabled';
      let buildxInstalled = 'Installed';
      let currentBuilder = 'default';
      let dockerVersion = 'Unknown';
      let useBuildKit = true;

      try {
        const vOut = await execAsync('docker --version');
        dockerVersion = vOut.stdout.trim().replace('Docker version ', '').split(',')[0] || 'Unknown';
      } catch (e) {}

      emitLog('INFO', 'Checking Buildx...');
      try {
        await streamCommand('docker buildx version');
        emitLog('SUCCESS', 'Buildx Installed');
      } catch (err) {
        emitLog('WARNING', 'Buildx Missing');
        emitLog('INFO', 'Attempting Repair...');
        try {
          await streamCommand('docker buildx install');
          emitLog('SUCCESS', 'Buildx Installed');
        } catch (e1) {
          try {
            await streamCommand('docker buildx create --use');
            emitLog('SUCCESS', 'Buildx Installed');
          } catch (e2) {
            emitLog('ERROR', 'Repair Failed');
            buildxInstalled = 'Missing';
            buildKitEnabled = 'Disabled';
            useBuildKit = false;
          }
        }
      }

      if (useBuildKit) {
        try {
          const builderOut = await execAsync('docker buildx inspect');
          const match = builderOut.stdout.match(/Name:\s+(.+)/);
          if (match && match[1]) currentBuilder = match[1];
        } catch (e) {}
      }

      emitLog('INFO', 'Docker Status Context:\n' +
        `Docker Version: ${dockerVersion}\n` +
        `Daemon: Running\n` +
        `BuildKit: ${buildKitEnabled}\n` +
        `Buildx: ${buildxInstalled}\n` +
        `Builder: ${currentBuilder}`
      );

      // Build image using Nixpacks
      // We will first generate the Dockerfile using Nixpacks, then build it using the host's Docker CLI
      // This bypasses issues where the nixpacks-cli container is missing buildx or has BuildKit issues
      const pkgJsonPath = path.join(workspace, 'package.json');
      let isSpa = false;
      let spaOutputDir = 'dist';
      try {
        const content = await fs.readFile(pkgJsonPath, 'utf8');
        const pkg = JSON.parse(content);
        const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
        if (deps['vite'] || deps['vue'] || deps['@angular/cli']) {
          isSpa = true;
          spaOutputDir = 'dist';
        } else if (deps['react-scripts']) {
          isSpa = true;
          spaOutputDir = 'build';
        }
      } catch (e) {}

      const isWin = process.platform === 'win32';
      let generateCmd = `nixpacks build "${workspace}" --out "${workspace}"`;
      
      const envs = project.environmentVariables as Record<string, string> || {};
      const decryptedEnvs: Record<string, string> = {};
      for (const [key, encValue] of Object.entries(envs)) {
        if (key === 'PORT') continue;
        try { decryptedEnvs[key] = decrypt(encValue); } catch (e) {}
      }
      
      // Inject env vars into Nixpacks plan so they are baked into the Dockerfile
      for (const [key, value] of Object.entries(decryptedEnvs)) {
        // Escape quotes to avoid shell injection
        const safeValue = value.replace(/"/g, '\\"');
        generateCmd += ` --env "${key}=${safeValue}"`;
      }

      emitLog('INFO', 'Generating Nixpacks build plan and Dockerfile...');
      
      let buildSuccess = false;
      let buildError: any = null;
      
      try {
         // For SPA projects (React/Vite/Vue/Angular), generate a custom nginx Dockerfile
         // This fixes white screen issues caused by React Router not working with Node.js server
         if (isSpa) {
            emitLog('INFO', `Detected SPA project. Generating nginx-based Dockerfile for proper routing...`);
            
            // Build env args for Dockerfile
            const buildArgs = Object.entries(decryptedEnvs)
              .map(([k, v]) => `ARG ${k}\nENV ${k}=$${k}`)
              .join('\n');
            const buildArgFlags = Object.entries(decryptedEnvs)
              .map(([k, v]) => `--build-arg ${k}="${v.replace(/"/g, '\\"')}"`)
              .join(' ');

            const nginxConf = `server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # React Router support - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}`;

            const spaDockerfile = `FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
${buildArgs}
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/${spaOutputDir} /usr/share/nginx/html
COPY --from=builder /app/.nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`;

            await fs.writeFile(path.join(workspace, '.nginx.conf'), nginxConf);
            await fs.writeFile(path.join(workspace, 'Dockerfile'), spaDockerfile);
            emitLog('SUCCESS', 'Custom nginx Dockerfile generated for SPA.');

            let dockerBuildCmd = `docker build -t ${imageName} ${buildArgFlags} "${workspace}"`;
            dockerBuildCmd = isWin ? `cmd /C "set DOCKER_BUILDKIT=1&& ${dockerBuildCmd}"` : `DOCKER_BUILDKIT=1 ${dockerBuildCmd}`;

            for (let attempt = 1; attempt <= 3; attempt++) {
               try {
                  if (attempt > 1) {
                     emitLog('WARNING', `Docker build retry ${attempt}/3...`);
                     await new Promise(resolve => setTimeout(resolve, 2000));
                  }
                  await streamCommand(dockerBuildCmd);
                  emitLog('SUCCESS', 'SPA Docker image built successfully.');
                  buildSuccess = true;
                  break;
               } catch (err) {
                  buildError = err;
                  emitLog('ERROR', `Build attempt ${attempt} failed.`);
               }
            }
         } else {
            // Non-SPA: check for existing Dockerfile or use Nixpacks
            let hasExistingDockerfile = false;
            try {
               await fs.stat(path.join(workspace, 'Dockerfile'));
               hasExistingDockerfile = true;
            } catch (e) {}

            if (hasExistingDockerfile) {
               emitLog('INFO', 'Found existing Dockerfile in repository root. Building directly with Docker...');
               let dockerBuildCmd = `docker build -t ${imageName} "${workspace}"`;
               dockerBuildCmd = isWin ? `cmd /C "set DOCKER_BUILDKIT=1&& ${dockerBuildCmd}"` : `DOCKER_BUILDKIT=1 ${dockerBuildCmd}`;

               for (let attempt = 1; attempt <= 3; attempt++) {
                  try {
                     if (attempt > 1) {
                        emitLog('WARNING', `Docker build retry ${attempt}/3...`);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                     }
                     await streamCommand(dockerBuildCmd);
                     emitLog('SUCCESS', 'Docker image built successfully using existing Dockerfile.');
                     buildSuccess = true;
                     break;
                  } catch (err) {
                     buildError = err;
                     emitLog('ERROR', `Build attempt ${attempt} failed.`);
                  }
               }
            } else {
               let nixpacksSuccess = false;
               try {
                  const envOverrides: Record<string, string> = {};
                  await streamCommand(generateCmd, envOverrides);
                  emitLog('SUCCESS', 'Nixpacks plan generated.');
                  nixpacksSuccess = true;
               } catch (nixErr: any) {
                  emitLog('WARNING', `Nixpacks failed to generate plan: ${nixErr.message}`);
                  emitLog('INFO', 'Generating standard Node.js fallback Dockerfile...');
                  
                  const fallbackDockerfile = `FROM node:20-alpine
WORKDIR /app
COPY . .
RUN if [ -f package.json ]; then npm install --legacy-peer-deps; fi
EXPOSE 3000 8080 5000 80
CMD if [ -f package.json ]; then npm start; else tail -f /dev/null; fi`;

                  await fs.writeFile(path.join(workspace, 'Dockerfile'), fallbackDockerfile);
               }

               emitLog('INFO', 'Building Docker image...');
               let dockerBuildCmd = nixpacksSuccess 
                  ? `docker build -t ${imageName} -f "${workspace}/.nixpacks/Dockerfile" "${workspace}"`
                  : `docker build -t ${imageName} "${workspace}"`;
               
               dockerBuildCmd = isWin ? `cmd /C "set DOCKER_BUILDKIT=1&& ${dockerBuildCmd}"` : `DOCKER_BUILDKIT=1 ${dockerBuildCmd}`;

               for (let attempt = 1; attempt <= 3; attempt++) {
                  try {
                     if (attempt > 1) {
                        emitLog('WARNING', `Docker build retry ${attempt}/3...`);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                     }
                     await streamCommand(dockerBuildCmd);
                     emitLog('SUCCESS', 'Image built successfully.');
                     buildSuccess = true;
                     break;
                  } catch (err) {
                     buildError = err;
                     emitLog('ERROR', `Build attempt ${attempt} failed.`);
                  }
               }
            }
         }
      } catch (err) {
         buildError = err;
         emitLog('ERROR', `Failed to build Docker image: ${err instanceof Error ? err.message : String(err)}`);
      }
      
      clearInterval(buildInterval);
      
      if (!buildSuccess) {
         throw buildError;
      }

      await updateProgress('Image Built', 85, true);


      // Stop old container if exists for this project
      const previousDeployments = await prisma.deployment.findMany({
        where: { projectId: project.id, status: 'Running', id: { not: deploymentId } }
      });
      for (const prev of previousDeployments) {
        if (prev.containerName) {
          try {
            await execAsync(`docker stop ${prev.containerName} && docker rm ${prev.containerName}`);
            await prisma.deployment.update({ where: { id: prev.id }, data: { status: 'Stopped' }});
            const tunnel = activeTunnels.get(prev.id);
            if (tunnel) {
              tunnel.close();
              activeTunnels.delete(prev.id);
            }
          } catch (e) {
            // ignore if container missing
          }
        }
      }

      await updateProgress('Starting Container', 90, true);
      
      let finalAssignedPort = 0;
      let finalContainerId = '';
      // SPA projects use nginx on port 80; non-SPA use project.port
      const internalPort = isSpa ? 80 : (project.port || 5000);
      

      if ((project as any).clusterId && (project as any).KubernetesCluster) {
        emitLog('INFO', `Deploying to Kubernetes cluster: ${(project as any).KubernetesCluster.name}`);
        const k8sService = new KubernetesService((project as any).KubernetesCluster.kubeconfig);
        const namespace = 'default';

        if ((project as any).registryId && (project as any).RegistryCredential) {
          const cred = (project as any).RegistryCredential;
          emitLog('INFO', `Logging into registry: ${cred.registryUrl}`);
          await execAsync(`docker login ${cred.registryUrl} -u ${cred.username} -p ${cred.password}`);
          const fullImageName = `${cred.registryUrl}/${cred.username}/${imageName}:latest`;
          emitLog('INFO', `Tagging and pushing image to registry: ${fullImageName}`);
          await execAsync(`docker tag ${imageName} ${fullImageName}`);
          await execAsync(`docker push ${fullImageName}`);
          imageName = fullImageName;
        } else {
          // Fallback to loading directly if it's a local cluster
          const clusterName = (project as any).KubernetesCluster.name.toLowerCase();
          if (clusterName.includes('kind')) {
            try {
              const kindName = clusterName.replace('kind-', '');
              emitLog('INFO', `Attempting to load image into kind cluster: ${kindName}...`);
              await execAsync(`kind load docker-image ${imageName} --name ${kindName}`);
            } catch (e: any) {
              emitLog('WARN', `Could not load image into kind. (Ensure 'kind' is installed if you face ErrImagePull): ${e.message}`);
            }
          } else if (clusterName.includes('minikube')) {
            try {
              emitLog('INFO', `Attempting to load image into minikube...`);
              await execAsync(`minikube image load ${imageName}`);
            } catch (e: any) {
              emitLog('WARN', `Could not load image into minikube: ${e.message}`);
            }
          } else {
            emitLog('INFO', 'No registry configured. Relying on local container runtime image cache (imagePullPolicy: IfNotPresent).');
          }
        }

        emitLog('INFO', 'Applying Kubernetes Deployment & Service...');
        decryptedEnvs['PORT'] = internalPort.toString();

        const k8sDir = path.join(workspace, '.k8s');
        await fs.mkdir(k8sDir, { recursive: true });

        if ((project as any).hasKubernetesManifest && (project as any).kubernetesManifestContent) {
          emitLog('INFO', 'Using custom Kubernetes manifest provided by user.');
          let customManifest = (project as any).kubernetesManifestContent;
          customManifest = customManifest.replace(/\{\{IMAGE_NAME\}\}/g, imageName);
          customManifest = customManifest.replace(/\{\{PORT\}\}/g, internalPort.toString());
          
          await fs.writeFile(path.join(k8sDir, 'custom.yaml'), customManifest);
          emitLog('INFO', '--- Custom Kubernetes Manifest ---\n' + customManifest);
        } else {
          emitLog('INFO', 'Generating Kubernetes YAML manifests...');
          const manifests = k8sService.generateManifests(namespace, containerName, imageName, internalPort, decryptedEnvs);
          await fs.writeFile(path.join(k8sDir, 'deployment.yaml'), manifests.deploymentYaml);
          await fs.writeFile(path.join(k8sDir, 'service.yaml'), manifests.serviceYaml);
          emitLog('INFO', '--- Kubernetes Deployment Manifest ---\n' + manifests.deploymentYaml);
          emitLog('INFO', '--- Kubernetes Service Manifest ---\n' + manifests.serviceYaml);
        }

        emitLog('INFO', 'Applying Kubernetes manifests via kubectl...');
        const kcPath = `${os.tmpdir()}/kubeconfig-${deploymentId}.yaml`;
        await fs.writeFile(kcPath, (project as any).KubernetesCluster.kubeconfig);
        
        await execAsync(`kubectl apply -f "${k8sDir}" --kubeconfig "${kcPath}"`);

        const localPfPort = await PortAllocationService.findAvailablePort(4000);
        finalAssignedPort = localPfPort;
        
        emitLog('INFO', 'Starting port-forwarding to Kubernetes service...');
        
        const pf = spawn('kubectl', ['--kubeconfig', kcPath, 'port-forward', `svc/${containerName}`, `${localPfPort}:${internalPort}`]);
        activeTunnels.set(`${deploymentId}-pf`, pf);
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const publicUrl = await provisionPublicTunnel(
          finalAssignedPort,
          project.name,
          project.id,
          deploymentId,
          decryptedEnvs,
          emitLog
        );
        
        await prisma.deployment.update({
           where: { id: deploymentId },
           data: {
              status: 'Success',
              progressPercentage: 100,
              completedAt: new Date(),
              publicUrl,
              assignedPort: finalAssignedPort,
              containerName,
              imageName,
              k8sNamespace: namespace,
              k8sDeploymentName: containerName,
              k8sServiceName: containerName
           }
        });
        await prisma.project.update({
           where: { id: project.id },
           data: { publicUrl, status: 'Deployed' }
        });
        emitDeploymentEvent(deploymentId, 'deployment:status', { status: 'Success', percentage: 100, publicUrl });
        return;
      }

      emitLog('INFO', `Attempting to start Docker container with dynamic port mapping...`);
        
      const runCmd = [
        'docker run -d',
        `-p 0:${internalPort}`,
        `--name ${containerName}`,
        '--restart unless-stopped',
        `-e PORT="${internalPort}"`
      ];

      // Decrypt and inject environment variables
      if (project.environmentVariables) {
        const envs = project.environmentVariables as Record<string, string>;
        for (const [key, encValue] of Object.entries(envs)) {
          if (key === 'PORT') continue; // Handled above
          try {
            const decValue = decrypt(encValue);
            const escapedValue = decValue.replace(/"/g, '\\"');
            runCmd.push(`-e ${key}="${escapedValue}"`);
          } catch (e) {
            console.error(`Failed to decrypt env var ${key}:`, e);
          }
        }
      }

      runCmd.push(imageName);

        await streamCommand(runCmd.join(' '));
        
        // Wait briefly to allow immediate crashes to surface
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const { stdout: containerState } = await execAsync(`docker inspect --format="{{.State.Status}}" ${containerName}`);
        if (containerState.trim() !== 'running') {
            let crashLogs = '';
            try {
              const { stdout: logs } = await execAsync(`docker logs ${containerName} --tail 20`);
              crashLogs = logs;
            } catch (e) {}
            
            emitLog('ERROR', `Container failed to stay running (State: ${containerState.trim()}). App crashed immediately.`);
            if (crashLogs) {
              emitLog('ERROR', `Crash logs:\n${crashLogs}`);
            }
            
            await execAsync(`docker rm -f ${containerName}`);
            throw new Error(`Application crashed immediately after startup. Check the logs for details.`);
        }

        // Retrieve the dynamically allocated port using docker port
        const { stdout: dockerPortOutput } = await execAsync(`docker port ${containerName}`);
        const match = dockerPortOutput.match(/0\.0\.0\.0:(\d+)/) || dockerPortOutput.match(/\[::\]:(\d+)/);
        
        if (match && match[1]) {
          finalAssignedPort = parseInt(match[1], 10);
        } else {
          await execAsync(`docker rm -f ${containerName}`);
          throw new Error('Docker did not expose any ports. Did the image EXPOSE a port?');
        }

        emitLog('INFO', `Container is running. Docker assigned dynamic host port ${finalAssignedPort}. Waiting for health check...`);
        await updateProgress('Health Check', 95, true);
        
          let isHealthy = false;
          const maxHealthCheckAttempts = 30; // 30 seconds timeout
          
          for (let hcAttempt = 0; hcAttempt < maxHealthCheckAttempts; hcAttempt++) {
             try {
                // Check if container crashed while we were waiting
                const { stdout: currentState } = await execAsync(`docker inspect --format="{{.State.Status}}" ${containerName}`);
                if (currentState.trim() !== 'running') {
                   break;
                }

                await fetch(`http://localhost:${finalAssignedPort}`);
                isHealthy = true;
                break;
             } catch (err: any) {
                // If connection is refused, it means the server isn't listening yet
                if (err.cause?.code === 'ECONNREFUSED' || err.code === 'ECONNREFUSED' || err.message.includes('fetch failed')) {
                   await new Promise(resolve => setTimeout(resolve, 1000));
                } else {
                   // Any response (even 404, 500) means the server is up and bound to the port
                   isHealthy = true;
                   break;
                }
             }
          }

          if (!isHealthy) {
             let crashLogs = '';
             try {
                const { stdout: logs } = await execAsync(`docker logs ${containerName} --tail 30`);
                crashLogs = logs;
             } catch (e) {}
             
             await execAsync(`docker rm -f ${containerName}`);
             
             emitLog('ERROR', `Health check failed: Application did not respond on port ${finalAssignedPort} within 30 seconds.`);
             if (crashLogs) {
                emitLog('ERROR', `Container logs:\n${crashLogs}`);
             }
             
             throw new Error(`Application failed to start or is not listening on the expected port (or it bound to 127.0.0.1 instead of 0.0.0.0 inside the container). Check the logs for details.`);
          }
          
          const { stdout: containerId } = await execAsync(`docker inspect --format="{{.Id}}" ${containerName}`);
          finalContainerId = containerId.trim();

          let publicUrl = '';
          try {
            publicUrl = await provisionPublicTunnel(
              finalAssignedPort,
              project.name,
              project.id,
              deploymentId,
              decryptedEnvs,
              emitLog
            );
          } catch (e) {
            emitLog('WARNING', 'Failed to provision public URL.');
          }

          emitLog('SUCCESS', `Container running successfully on port ${finalAssignedPort}.`);
          await updateProgress('Deployment Complete', 100, true);

          await prisma.deployment.update({
            where: { id: deploymentId },
            data: { 
              status: 'Running', 
              containerId: finalContainerId,
              assignedPort: finalAssignedPort,
              imageName: imageName,
              containerName: containerName,
              localUrl: `http://localhost:${finalAssignedPort}`,
              publicUrl: publicUrl || null,
              completedAt: new Date()
            }
          });

          if (publicUrl) {
            await prisma.project.update({
              where: { id: project.id },
              data: { publicUrl: publicUrl }
            });
          }

          emitDeploymentEvent(deploymentId, 'deployment:status', {
            status: 'Running',
            url: `http://localhost:${finalAssignedPort}`,
            publicUrl: publicUrl || null
          });
          emitDeploymentEvent(deploymentId, 'deployment:completed', { 
            url: `http://localhost:${finalAssignedPort}`,
            publicUrl: publicUrl || null
          });
          
          // Notify user
          await NotificationService.createNotification(
            userId,
            `Deployment Successful: ${project.name}`,
            `Version v${project.Deployment?.length ? project.Deployment.length + 1 : 1} is now running.`,
            'SUCCESS'
          ).catch(() => {});

          await prisma.project.update({
            where: { id: project.id },
            data: { 
              status: 'Active',
              port: finalAssignedPort
            }
          });
          emitToUser(userId, 'project:updated', { projectId: project.id, status: 'Active', port: finalAssignedPort });

    } catch (error: any) {
      console.error('Deployment error:', error);
      emitLog('ERROR', `Deployment failed: ${error.message}`);
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { 
          status: 'Failed', 
          errorMessage: error.message,
          completedAt: new Date()
        }
      });
      emitDeploymentEvent(deploymentId, 'deployment:status', { status: 'Failed' });
      emitDeploymentEvent(deploymentId, 'deployment:error', { message: error.message });

      await NotificationService.createNotification(
        userId,
        `Deployment Failed`,
        error.message,
        'ERROR'
      ).catch(() => {});

      await prisma.project.update({
        where: { id: projectId },
        data: { status: 'Failed' }
      });
      emitToUser(userId, 'project:updated', { projectId: projectId, status: 'Failed' });
    } finally {
      clearInterval(statsInterval);
      if (workspace) {
        try {
          await fs.rm(workspace, { recursive: true, force: true });
        } catch (e) {
          console.error('Cleanup error:', e);
        }
      }
      if (logFileHandle) {
        await logFileHandle.close().catch(() => {});
      }

      // Retention policy: Keep only last 30 deployments
      try {
        const deployments = await prisma.deployment.findMany({
          where: { projectId },
          orderBy: { version: 'desc' },
          select: { id: true, logFile: true }
        });
        
        if (deployments.length > 30) {
          const toDelete = deployments.slice(30);
          for (const dep of toDelete) {
            await prisma.deployment.delete({ where: { id: dep.id } });
            if (dep.logFile) {
              await fs.unlink(dep.logFile).catch(() => {});
            }
          }
        }
      } catch (e) {
        console.error('Failed to run retention policy cleanup:', e);
      }
    }
  }

  static async stopDeployment(deploymentId: string, userId: string) {
    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: { Project: true }
    });

    if (!deployment || deployment.Project.ownerId !== userId) {
      throw new Error('Deployment not found or access denied');
    }

    if (deployment.containerName) {
      try {
        await execAsync(`docker stop ${deployment.containerName} && docker rm ${deployment.containerName}`);
      } catch (e) {
        // ignore
      }
    }
    
    const tunnel = activeTunnels.get(deploymentId);
    if (tunnel) {
      closeTunnel(tunnel);
      activeTunnels.delete(deploymentId);
    }

    return prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: 'Stopped' }
    });
  }

  static async startExistingDeployment(deploymentId: string, userId: string) {
    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: { Project: true }
    });

    if (!deployment || (deployment as any).Project.ownerId !== userId) {
      throw new Error('Deployment not found or access denied');
    }

    if (deployment.containerName) {
      try {
        await execAsync(`docker start ${deployment.containerName}`);
      } catch (e) {
        // ignore
      }
    }

    return prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: 'Running' }
    });
  }

  static async deleteDeployment(deploymentId: string, userId: string) {
    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: { Project: true }
    });

    if (!deployment || (deployment as any).Project.ownerId !== userId) {
      throw new Error('Deployment not found or access denied');
    }

    if (deployment.containerName) {
      try {
        await execAsync(`docker stop ${deployment.containerName}`);
        await execAsync(`docker rm ${deployment.containerName}`);
      } catch (e) {
        // ignore
      }
    }

    const tunnel = activeTunnels.get(deploymentId);
    if (tunnel) {
      closeTunnel(tunnel);
      activeTunnels.delete(deploymentId);
    }

    await prisma.deployment.delete({
      where: { id: deploymentId }
    });
  }
}
