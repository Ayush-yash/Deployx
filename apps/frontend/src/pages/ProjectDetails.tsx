import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '../services/projectService';
import { deploymentService } from '../services/deploymentService';
import { GlassCard } from '../components/GlassCard';
import { FrameworkBadge, StatusBadge } from '../components/ProjectCard';
import { KubernetesDashboard } from '../components/KubernetesDashboard';
import { Loader2, Edit2, Play, GitBranch, Box, Settings, Clock, CheckCircle, XCircle, Webhook, Copy, RefreshCw, Zap, ZapOff, ArrowRight, ExternalLink } from 'lucide-react';

const ProjectDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [webhookSecret, setWebhookSecret] = React.useState<string | null>(null);
  const [autoDeploy, setAutoDeploy] = React.useState<boolean>(true);
  const [webhookUrl, setWebhookUrl] = React.useState<string>('');
  const [copied, setCopied] = React.useState<string | null>(null);

  const { data: project, isLoading } = useQuery({
    queryKey: ['projects', id],
    queryFn: () => projectService.getProject(id!),
    enabled: !!id
  });

  const { data: webhookConfigData } = useQuery({
    queryKey: ['webhook-config', id],
    queryFn: () => projectService.getWebhookConfig(id!),
    enabled: !!id
  });

  React.useEffect(() => {
    if (webhookConfigData) {
      setAutoDeploy(webhookConfigData.autoDeploy);
      setWebhookUrl(webhookConfigData.webhookUrl);
    }
  }, [webhookConfigData]);

  const deployMutation = useMutation({
    mutationFn: () => deploymentService.deployProject(id!),
    onSuccess: (data) => {
      if (data?.deploymentId) {
        navigate(`/dashboard/deployments/${data.deploymentId}`);
      } else {
        throw new Error('Invalid deployment ID returned');
      }
    }
  });

  const generateSecretMutation = useMutation({
    mutationFn: () => projectService.generateWebhookSecret(id!),
    onSuccess: (data) => {
      setWebhookSecret(data.webhookSecret);
      setWebhookUrl(data.webhookUrl);
      queryClient.invalidateQueries({ queryKey: ['webhook-config', id] });
    }
  });

  const toggleAutoDeployMutation = useMutation({
    mutationFn: (val: boolean) => projectService.toggleAutoDeploy(id!, val),
    onSuccess: (data) => setAutoDeploy(data.autoDeploy)
  });

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!project) {
    return <div className="text-white text-center py-12">Project not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-white">{project.name}</h1>
            <StatusBadge status={project.status} />
          </div>
          <p className="text-slate-400">{project.description || 'No description provided.'}</p>
        </div>
        <div className="flex items-center gap-3">
          {project.status === 'Active' && project.port && (
            <a
              href={project.publicUrl?.includes('trycloudflare.com') ? `http://localhost:${project.port}` : (project.publicUrl || `http://localhost:${project.port}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg shadow-lg shadow-emerald-500/25 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              Open App
            </a>
          )}
          <button
            onClick={() => deployMutation.mutate()}
            disabled={deployMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
          >
            {deployMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            Deploy Now
          </button>
          <Link 
            to={`/dashboard/projects/${project.id}/edit`}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 font-medium rounded-lg border border-slate-700 transition-colors"
          >
            <Edit2 className="w-4 h-4" /> Edit
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="p-6 md:col-span-2 space-y-6">
          <h3 className="text-lg font-semibold text-white border-b border-slate-700/50 pb-2 flex items-center gap-2">
            <Box className="w-5 h-5 text-blue-400" />
            Repository Information
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="text-sm text-slate-400 block mb-1">GitHub URL</label>
              <a href={project.githubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors">
                <GitBranch className="w-4 h-4" />
                <span className="truncate">{project.githubUrl.split('github.com/')[1] || project.githubUrl}</span>
              </a>
            </div>
            
            <div>
              <label className="text-sm text-slate-400 block mb-1">Branch</label>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/50 border border-slate-700 rounded font-mono text-sm text-slate-300">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M17.75 6a2.25 2.25 0 1 0-2.25 2.25v2.339a3.755 3.755 0 0 0-.256-.039H7a3.75 3.75 0 0 0-3.75 3.75v1.45a2.25 2.25 0 1 0 1.5 0V14.3a2.25 2.25 0 0 1 2.25-2.25h8.244a3.75 3.75 0 0 0 .256-.039v2.339a2.25 2.25 0 1 0 1.5 0V8.25A2.25 2.25 0 0 0 17.75 6zM4 18.75a.75.75 0 1 1 .75-.75.75.75 0 0 1-.75.75zm13.75.75a.75.75 0 1 1 .75-.75.75.75 0 0 1-.75.75zM17.75 6.75a.75.75 0 1 1 .75-.75.75.75 0 0 1-.75.75z"></path></svg>
                {project.branch}
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-400 block mb-1">Framework</label>
              <FrameworkBadge framework={project.framework} />
            </div>

            <div>
              <label className="text-sm text-slate-400 block mb-1">Port</label>
              <span className="text-white font-medium">{project.port || 'Default'}</span>
            </div>
          </div>
        </GlassCard>

        <div className="space-y-6">
          <GlassCard className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white border-b border-slate-700/50 pb-2 flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-400" />
              Activity
            </h3>
            <div>
              <label className="text-sm text-slate-400 block mb-1">Created</label>
              <span className="text-white">{new Date(project.createdAt).toLocaleDateString()}</span>
            </div>
            <div>
              <label className="text-sm text-slate-400 block mb-1">Last Updated</label>
              <span className="text-white">{new Date(project.updatedAt).toLocaleDateString()}</span>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-white border-b border-slate-700/50 pb-2 flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-slate-400" />
              Env Vars
            </h3>
            
            {project.environmentVariables && Object.keys(project.environmentVariables).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(project.environmentVariables).map(([key, _]) => (
                  <div key={key} className="flex items-center gap-2 text-sm text-slate-300 bg-slate-800/30 p-2 rounded border border-slate-700/50">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-mono">{key}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-slate-500 text-sm flex flex-col items-center">
                <XCircle className="w-6 h-6 mb-2 text-slate-600" />
                No environment variables configured.
              </div>
            )}
          </GlassCard>

          {/* Webhook Integration Panel */}
          <GlassCard className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white border-b border-slate-700/50 pb-2 flex items-center gap-2">
              <Webhook className="w-5 h-5 text-blue-400" />
              Auto Deploy
            </h3>

            <div className="flex items-center justify-between mt-8 mb-4">
              <div>
                <p className="text-sm font-medium text-slate-200">Auto Deploy</p>
                <p className="text-xs text-slate-500">Deploy on every push</p>
              </div>
              <button
                onClick={() => toggleAutoDeployMutation.mutate(!autoDeploy)}
                disabled={toggleAutoDeployMutation.isPending}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  autoDeploy
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                }`}
              >
                {autoDeploy ? <Zap className="w-3 h-3" /> : <ZapOff className="w-3 h-3" />}
                {autoDeploy ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            {/* Webhook URL */}
            <div>
              <p className="text-xs text-slate-400 mb-1 font-medium">Webhook URL</p>
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2">
                <code className="text-xs text-blue-300 flex-1 truncate">{webhookUrl || 'http://localhost:3001/api/webhooks/github'}</code>
                <button onClick={() => copyToClipboard(webhookUrl, 'url')} className="text-slate-400 hover:text-white">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              {copied === 'url' && <p className="text-xs text-emerald-400 mt-1">Copied!</p>}
            </div>

            {/* Generate/Show Secret */}
            <div>
              <p className="text-xs text-slate-400 mb-2 font-medium">Webhook Secret</p>
              {webhookSecret ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 bg-slate-900 border border-amber-500/30 rounded-lg px-3 py-2">
                    <code className="text-xs text-amber-300 flex-1 break-all">{webhookSecret}</code>
                    <button onClick={() => copyToClipboard(webhookSecret, 'secret')} className="text-slate-400 hover:text-white shrink-0">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {copied === 'secret' && <p className="text-xs text-emerald-400">Copied!</p>}
                  <p className="text-xs text-amber-400/80">⚠ Save this secret now — it won't be shown again.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">{webhookConfigData?.hasWebhookSecret ? '✓ Secret configured' : 'No secret generated yet.'}</p>
                  <button
                    onClick={() => generateSecretMutation.mutate()}
                    disabled={generateSecretMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-sm font-medium rounded-lg border border-blue-500/30 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${generateSecretMutation.isPending ? 'animate-spin' : ''}`} />
                    {webhookConfigData?.hasWebhookSecret ? 'Regenerate Secret' : 'Generate Secret'}
                  </button>
                </div>
              )}
            </div>

            <div className="text-xs text-slate-500 border-t border-slate-700/50 pt-3 space-y-1">
              <p className="font-medium text-slate-400">Setup instructions:</p>
              <p>1. Copy the Webhook URL above</p>
              <p>2. Go to your GitHub repo Settings → Webhooks</p>
              <p>3. Add webhook with <code className="text-blue-400">application/json</code></p>
              <p>4. Paste the Secret for HMAC security</p>
            </div>
          </GlassCard>

          {/* Kubernetes Integration Panel */}
          <KubernetesDashboard projectId={project.id} />
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-400" />
          Deployment History
        </h2>
        <GlassCard className="p-0 overflow-hidden">
          <DeploymentsList projectId={project.id} />
        </GlassCard>
      </div>
    </div>
  );
};

const DeploymentsList = ({ projectId }: { projectId: string }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: deployments, isLoading } = useQuery({
    queryKey: ['deployments', projectId],
    queryFn: () => deploymentService.getDeployments(),
    select: (data) => data.filter(d => d.projectId === projectId)
  });

  const rollbackMutation = useMutation({
    mutationFn: async (dep: any) => {
      return deploymentService.deployProject(projectId, {
        commitHash: dep.commitHash,
        commitMessage: `Rollback to version v${dep.version} (${dep.commitHash?.substring(0, 7)})`,
        authorName: 'Rollback System'
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['deployments', projectId] });
      navigate(`/dashboard/deployments/${data.deploymentId}`);
    }
  });

  if (isLoading) return <div className="p-8 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;
  if (!deployments || deployments.length === 0) return <div className="p-8 text-center text-slate-400">No deployments yet.</div>;

  return (
    <div className="divide-y divide-slate-800">
      {deployments.map(dep => (
        <div key={dep.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                  v{dep.version || 1}
                </span>
                <StatusBadge status={dep.status} />
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(dep.createdAt).toLocaleString()}</span>
                {dep.commitHash && (
                  <span className="flex items-center gap-1 font-mono bg-slate-800 px-1.5 rounded text-slate-300">
                    <GitBranch className="w-3 h-3" /> {dep.commitHash.substring(0, 7)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dep.commitHash && dep.status !== 'Building' && dep.status !== 'Queued' && (
              <button
                onClick={() => rollbackMutation.mutate(dep)}
                disabled={rollbackMutation.isPending}
                className="flex items-center gap-1.5 text-sm font-medium text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded transition-colors disabled:opacity-50"
              >
                {rollbackMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>Rollback</>
                )}
              </button>
            )}
            <Link 
              to={`/dashboard/deployments/${dep.id}`}
              className="flex items-center gap-1 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded transition-colors"
            >
              View Logs <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProjectDetails;
