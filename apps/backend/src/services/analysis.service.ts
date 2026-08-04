import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface AnalysisResult {
  framework: string;
  language: string;
  runtime: string;
  packageManager: string;
  buildCommand: string;
  startCommand: string;
  outputDirectory: string;
  hasDockerfile: boolean;
  hasDockerCompose: boolean;
  environmentVariables: Record<string, string>;
  dockerfileContent: string | null;
  port: number | null;
  readinessScore: number;
}

export class AnalysisService {
  static async analyzeRepository(githubUrl: string, branch: string, token: string): Promise<AnalysisResult> {
    const authRepoUrl = githubUrl.replace('https://', `https://${token}@`);
    const tempDir = path.join(os.tmpdir(), 'deployx_analysis', `${Date.now()}_${Math.random().toString(36).substring(7)}`);
    
    const result: AnalysisResult = {
      framework: 'Unknown',
      language: 'Unknown',
      runtime: 'Unknown',
      packageManager: 'Unknown',
      buildCommand: '',
      startCommand: '',
      outputDirectory: '',
      hasDockerfile: false,
      hasDockerCompose: false,
      environmentVariables: {},
      dockerfileContent: null,
      port: null,
      readinessScore: 0
    };

    try {
      await fs.mkdir(tempDir, { recursive: true });
      try {
        await execAsync(`git clone --depth 1 --branch ${branch} --single-branch ${authRepoUrl} ${tempDir}`);
      } catch (authError) {
        console.warn('Authenticated clone failed (maybe invalid PAT), trying unauthenticated clone...');
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
        await fs.mkdir(tempDir, { recursive: true });
        await execAsync(`git clone --depth 1 --branch ${branch} --single-branch ${githubUrl} ${tempDir}`);
      }
      
      const files = await fs.readdir(tempDir);

      // Detect Docker
      if (files.includes('Dockerfile') || files.includes('Dockerfile.prod')) {
        result.hasDockerfile = true;
      }
      if (files.includes('docker-compose.yml') || files.includes('docker-compose.yaml')) {
        result.hasDockerCompose = true;
      }

      // Detect .env.example
      if (files.includes('.env.example')) {
        try {
          const envContent = await fs.readFile(path.join(tempDir, '.env.example'), 'utf8');
          const lines = envContent.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
              const [key] = trimmed.split('=');
              if (key) {
                result.environmentVariables[key.trim()] = '';
              }
            }
          }
        } catch (e) {
          // ignore
        }
      }

      // Aggressive grep for environment variables
      const detectEnvVars = async (dir: string) => {
        try {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) continue;
            
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              await detectEnvVars(fullPath);
            } else if (entry.isFile() && /\.(js|ts|jsx|tsx|py|php)$/.test(entry.name)) {
              try {
                const content = await fs.readFile(fullPath, 'utf8');
                // Match process.env.KEY and import.meta.env.KEY
                const regex = /(?:process\.env|import\.meta\.env)\.([a-zA-Z_][a-zA-Z0-9_]*)/g;
                let match;
                while ((match = regex.exec(content)) !== null) {
                  const key = match[1];
                  if (key && !Object.prototype.hasOwnProperty.call(result.environmentVariables, key)) {
                    result.environmentVariables[key] = '';
                  }
                }
              } catch (e) {}
            }
          }
        } catch (e) {}
      };

      await detectEnvVars(tempDir);

      // Detect Node.js
      if (files.includes('package.json')) {
        result.language = 'JavaScript/TypeScript';
        result.runtime = 'Node.js';
        
        // Detect Package Manager
        if (files.includes('yarn.lock')) result.packageManager = 'yarn';
        else if (files.includes('pnpm-lock.yaml')) result.packageManager = 'pnpm';
        else if (files.includes('bun.lockb')) result.packageManager = 'bun';
        else result.packageManager = 'npm';

        const pkgContent = await fs.readFile(path.join(tempDir, 'package.json'), 'utf8');
        const pkg = JSON.parse(pkgContent);

        const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
        const scripts = pkg.scripts || {};

        if (deps['next']) {
          result.framework = 'Next.js';
          result.buildCommand = `${result.packageManager} run build`;
          result.startCommand = `${result.packageManager} start`;
          result.outputDirectory = '.next';
        } else if (deps['react'] && deps['react-scripts']) {
          result.framework = 'React (CRA)';
          result.buildCommand = `${result.packageManager} run build`;
          result.startCommand = `npx serve -s build`;
          result.outputDirectory = 'build';
        } else if (deps['react'] && deps['vite']) {
          result.framework = 'React (Vite)';
          result.buildCommand = `${result.packageManager} run build`;
          result.startCommand = `npx serve -s dist`;
          result.outputDirectory = 'dist';
        } else if (deps['@angular/core']) {
          result.framework = 'Angular';
          result.buildCommand = `${result.packageManager} run build`;
          result.startCommand = `npx serve -s dist`;
          result.outputDirectory = 'dist';
        } else if (deps['vue']) {
          result.framework = 'Vue';
          result.buildCommand = `${result.packageManager} run build`;
          result.startCommand = `npx serve -s dist`;
          result.outputDirectory = 'dist';
        } else if (deps['express']) {
          result.framework = 'Express';
          result.startCommand = scripts.start ? `${result.packageManager} start` : 'node index.js';
        } else {
          result.framework = 'Node.js';
          if (scripts.build) result.buildCommand = `${result.packageManager} run build`;
          if (scripts.start) result.startCommand = `${result.packageManager} start`;
        }
      }
      
      // Detect Python
      else if (files.includes('requirements.txt') || files.includes('Pipfile') || files.includes('pyproject.toml')) {
        result.language = 'Python';
        result.runtime = 'Python';
        if (files.includes('Pipfile')) result.packageManager = 'pipenv';
        else if (files.includes('pyproject.toml')) result.packageManager = 'poetry';
        else result.packageManager = 'pip';

        let hasDjango = false;
        let hasFlask = false;

        if (files.includes('requirements.txt')) {
          const reqs = await fs.readFile(path.join(tempDir, 'requirements.txt'), 'utf8');
          hasDjango = reqs.toLowerCase().includes('django');
          hasFlask = reqs.toLowerCase().includes('flask');
        }

        if (hasDjango || files.includes('manage.py')) {
          result.framework = 'Django';
          result.startCommand = 'python manage.py runserver 0.0.0.0:8000';
        } else if (hasFlask) {
          result.framework = 'Flask';
          result.startCommand = 'flask run --host=0.0.0.0';
        } else {
          result.framework = 'Python';
          result.startCommand = 'python app.py';
        }
      }
      
      // Detect PHP
      else if (files.includes('composer.json')) {
        result.language = 'PHP';
        result.runtime = 'PHP';
        result.packageManager = 'composer';
        
        const comp = await fs.readFile(path.join(tempDir, 'composer.json'), 'utf8');
        if (comp.includes('laravel/framework')) {
          result.framework = 'Laravel';
          result.startCommand = 'php artisan serve --host=0.0.0.0';
        } else {
          result.framework = 'PHP';
        }
      }
      
      // Detect Java / Spring Boot
      else if (files.includes('pom.xml') || files.includes('build.gradle')) {
        result.language = 'Java';
        result.runtime = 'Java';
        if (files.includes('pom.xml')) {
          result.packageManager = 'maven';
          result.buildCommand = 'mvn clean package -DskipTests';
          result.startCommand = 'java -jar target/*.jar';
        } else {
          result.packageManager = 'gradle';
          result.buildCommand = './gradlew build -x test';
          result.startCommand = 'java -jar build/libs/*.jar';
        }
        
        try {
          const content = files.includes('pom.xml') ? await fs.readFile(path.join(tempDir, 'pom.xml'), 'utf8') : await fs.readFile(path.join(tempDir, 'build.gradle'), 'utf8');
          if (content.includes('spring-boot')) {
            result.framework = 'Spring Boot';
          } else {
            result.framework = 'Java App';
          }
        } catch (e) {}
      }

      // Detect Go
      else if (files.includes('go.mod')) {
        result.language = 'Go';
        result.runtime = 'Go';
        result.packageManager = 'go modules';
        result.framework = 'Go App';
        result.buildCommand = 'go build -o main .';
        result.startCommand = './main';
      }

      // Port Detection
      let detectedPort: number | null = null;
      
      // 1. Dockerfile EXPOSE
      if (result.hasDockerfile) {
        try {
          const dfName = files.includes('Dockerfile.prod') ? 'Dockerfile.prod' : 'Dockerfile';
          const dfContent = await fs.readFile(path.join(tempDir, dfName), 'utf8');
          const exposeMatch = dfContent.match(/EXPOSE\s+(\d+)/i);
          if (exposeMatch && exposeMatch[1]) detectedPort = parseInt(exposeMatch[1], 10);
        } catch (e) {}
      }

      // 2. Environment Variables (.env.example)
      if (!detectedPort && result.environmentVariables['PORT']) {
        const p = parseInt(result.environmentVariables['PORT'], 10);
        if (!isNaN(p)) detectedPort = p;
      }

      // 3. Heuristics & Defaults
      if (!detectedPort) {
        if (['React (Vite)', 'React (CRA)', 'Vue', 'Angular'].includes(result.framework)) {
          detectedPort = 80; // Nginx static serving
        } else if (result.framework === 'Next.js') {
          detectedPort = 3000;
        } else if (['Django', 'Laravel'].includes(result.framework)) {
          detectedPort = 8000;
        } else if (result.framework === 'Flask') {
          detectedPort = 5000;
        } else if (result.language === 'JavaScript/TypeScript') {
          try {
            const pkgContent = await fs.readFile(path.join(tempDir, 'package.json'), 'utf8');
            const portMatch = pkgContent.match(/PORT=(\d+)/);
            if (portMatch && portMatch[1]) {
              detectedPort = parseInt(portMatch[1], 10);
            } else {
              // Scan common entry files
              for (const file of ['index.js', 'server.js', 'app.js', 'src/index.js', 'src/server.js', 'src/main.ts']) {
                 try {
                   const content = await fs.readFile(path.join(tempDir, file), 'utf8');
                   const listenMatch = content.match(/\.listen\(\s*(?:process\.env\.PORT\s*\|\|\s*)?(\d+)/);
                   if (listenMatch && listenMatch[1]) {
                     detectedPort = parseInt(listenMatch[1], 10);
                     break;
                   }
                   const portVarMatch = content.match(/(?:const|let|var)\s+PORT\s*=\s*(?:process\.env\.PORT\s*\|\|\s*)?(\d+)/);
                   if (portVarMatch && portVarMatch[1]) {
                     detectedPort = parseInt(portVarMatch[1], 10);
                     break;
                   }
                 } catch (e) {}
              }
            }
          } catch (e) {}
          if (!detectedPort) detectedPort = 3000;
        }
      }
      
      result.port = detectedPort;

      // Handle Dockerfile
      if (result.hasDockerfile) {
        try {
          const dfName = files.includes('Dockerfile.prod') ? 'Dockerfile.prod' : 'Dockerfile';
          result.dockerfileContent = await fs.readFile(path.join(tempDir, dfName), 'utf8');
        } catch (e) {
          console.error('Failed to read existing Dockerfile:', e);
        }
      } else {
        // Generate a Dockerfile based on the detected framework
        result.dockerfileContent = AnalysisService.generateDockerfile(result);
      }
      
      // Calculate Readiness Score
      let score = 0;
      if (result.language !== 'Unknown') score += 20;
      if (result.framework !== 'Unknown') score += 20;
      if (result.hasDockerfile || result.dockerfileContent) score += 30; // Auto-generated or existing dockerfile gives high confidence
      if (result.port) score += 10;
      if (result.buildCommand || result.startCommand) score += 20;
      
      result.readinessScore = Math.min(score, 100);

    } catch (error) {
      console.error('Analysis failed:', error);
      throw new Error('Failed to analyze repository. Ensure the branch exists and DeployX has access.');
    } finally {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (e) {
        console.error('Failed to cleanup temp dir:', e);
      }
    }

    return result;
  }

  private static generateDockerfile(config: AnalysisResult): string {
    const pm = config.packageManager || 'npm';
    const installCmd = pm === 'yarn' ? 'yarn install --frozen-lockfile' : pm === 'pnpm' ? 'pnpm install --frozen-lockfile' : pm === 'bun' ? 'bun install' : 'npm ci';
    const buildCmd = config.buildCommand || `${pm} run build`;
    const startCmd = config.startCommand || `${pm} start`;
    
    // React / Vite / Vue / Angular (Static Sites)
    if (['React (Vite)', 'React (CRA)', 'Vue', 'Angular'].includes(config.framework)) {
      const outDir = config.outputDirectory || 'dist';
      return `# Build Stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
${pm === 'pnpm' ? 'RUN npm install -g pnpm\nCOPY pnpm-lock.yaml ./' : ''}
${pm === 'bun' ? 'RUN npm install -g bun\nCOPY bun.lockb ./' : ''}
RUN ${installCmd}
COPY . .
RUN ${buildCmd}

# Production Stage
FROM nginx:alpine
COPY --from=builder /app/${outDir} /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`;
    }
    
    // Next.js
    if (config.framework === 'Next.js') {
      const p = config.port || 3000;
      return `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
${pm === 'pnpm' ? 'RUN npm install -g pnpm\nCOPY pnpm-lock.yaml ./' : ''}
RUN ${installCmd}
COPY . .
RUN ${buildCmd}
EXPOSE ${p}
CMD ["${pm}", "start"]`;
    }
    
    // Node.js / Express
    if (config.language === 'JavaScript/TypeScript') {
      const p = config.port || 3000;
      return `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
${pm === 'pnpm' ? 'RUN npm install -g pnpm\nCOPY pnpm-lock.yaml ./' : ''}
RUN ${installCmd}
COPY . .
${config.buildCommand ? 'RUN ' + config.buildCommand + '\n' : ''}EXPOSE ${p}
CMD ["sh", "-c", "${startCmd}"]`;
    }
    
    // Python / Django / Flask
    if (config.language === 'Python') {
      const p = config.port || 8000;
      const pyInstall = config.packageManager === 'pipenv' ? 'pip install pipenv && pipenv install --system --deploy' 
        : config.packageManager === 'poetry' ? 'pip install poetry && poetry config virtualenvs.create false && poetry install --no-dev'
        : 'pip install --no-cache-dir -r requirements.txt';
      
      return `FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN ${pyInstall}
EXPOSE ${p}
CMD ["sh", "-c", "${startCmd}"]`;
    }
    
    // PHP / Laravel
    if (config.language === 'PHP') {
      const p = config.port || 8000;
      return `FROM php:8.2-cli
WORKDIR /app
RUN apt-get update && apt-get install -y unzip zip
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer
COPY . .
RUN composer install --no-dev --optimize-autoloader
EXPOSE ${p}
CMD ["sh", "-c", "${startCmd}"]`;
    }

    // Java / Spring Boot
    if (config.language === 'Java') {
      const p = config.port || 8080;
      if (pm === 'maven') {
        return `FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline || true
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE ${p}
CMD ["java", "-jar", "app.jar"]`;
      } else {
        return `FROM gradle:8-jdk17 AS builder
WORKDIR /app
COPY . .
RUN ./gradlew build -x test

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
EXPOSE ${p}
CMD ["java", "-jar", "app.jar"]`;
      }
    }

    // Go
    if (config.language === 'Go') {
      const p = config.port || 8080;
      return `FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/main .
EXPOSE ${p}
CMD ["./main"]`;
    }

    // Default Fallback
    return `FROM alpine:latest
WORKDIR /app
COPY . .
CMD ["echo", "No specific framework detected."]`;
  }
}
