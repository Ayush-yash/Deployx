# DeployX 🚀

DeployX is an open-source, powerful Cloud Management and Platform-as-a-Service (PaaS) solution designed to simplify the deployment, scaling, and management of modern web applications. Think of it as your own self-hosted Vercel or Railway!

![DeployX Dashboard](https://img.shields.io/badge/DeployX-Cloud_Platform-blue?style=for-the-badge&logo=cloud)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Kubernetes](https://img.shields.io/badge/Kubernetes-326CE5?style=for-the-badge&logo=kubernetes&logoColor=white)

## ✨ Features

- **Automated Deployments:** Connect your GitHub repositories and deploy automatically.
- **Nixpacks & Docker Integration:** Automatically builds images from source code without needing a Dockerfile.
- **Environment Variable Management:** Automatically discovers and injects environment variables during build and runtime.
- **Kubernetes Support:** Deploy containers directly to local (Kind/Minikube) or remote Kubernetes clusters using custom manifests.
- **Secure Cloudflare Tunnels:** Instantly generate secure, public HTTPS URLs for your deployments via Cloudflare.
- **Real-time Logs:** View build and container logs in real-time through WebSocket connections.
- **Database Management:** Integrated PostgreSQL provisioning and management.
- **Modern UI:** A beautiful, responsive frontend built with React, Vite, and TailwindCSS.

## 🏗️ Architecture

DeployX consists of two main components in a monorepo structure:
- **`apps/frontend/`**: The dashboard UI (React + Vite + Tailwind CSS).
- **`apps/backend/`**: The core engine handling Docker builds, GitHub API, WebSockets, and database operations (Express + Prisma + TypeScript).

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Docker & Docker Buildx](https://docs.docker.com/buildx/working-with-buildx/)
- [PostgreSQL](https://www.postgresql.org/)
- [Cloudflare tunnel daemon (`cloudflared`)](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/)
- [Nixpacks](https://nixpacks.com/) (Optional, used for builds)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/deployx.git
   cd deployx
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in `apps/backend/` and `apps/frontend/`. You can copy from the provided `.env.example` files.
   - You will need a GitHub OAuth App for authentication.
   - Configure your PostgreSQL connection string.

4. **Database Setup (Prisma):**
   ```bash
   cd apps/backend
   npx prisma generate
   npx prisma db push
   ```

5. **Start the Development Servers:**
   - Run `npm run dev` in the root directory to start both the Frontend and Backend concurrently!

## 🛠️ Usage

1. Login using your GitHub account on the frontend dashboard.
2. Import a project from your GitHub repositories.
3. Configure ports, environment variables, or Kubernetes settings if needed.
4. Click **Deploy**. DeployX will fetch the code, build a Docker image using Nixpacks, run it, and expose a public Cloudflare URL!

## 📜 License

This project is licensed under the MIT License.
