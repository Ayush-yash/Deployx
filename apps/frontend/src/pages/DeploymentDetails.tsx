import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '../utils/animations';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deploymentService } from '../services/deploymentService';
import { socketService } from '../services/socketService';
import { GlassCard } from '../components/GlassCard';
import { Loader2, ArrowLeft, ExternalLink, Play, Square, Trash2, Terminal, CheckCircle2, Circle, AlertCircle, GitCommit } from 'lucide-react';
import { StatusBadge } from '../components/ProjectCard';
import { clsx } from 'clsx';
import { DeploymentTerminal } from '../components/DeploymentTerminal';
import { ProgressBar } from '../components/ProgressBar';

const DeploymentTimeline: React.FC<{ status: string; currentStep?: string; error?: string | null }> = ({ status, currentStep, error }) => {
  const steps = [
    { key: 'Initializing', label: 'Initializing' },
    { key: 'Repository Cloning', label: 'Cloning Repository' },
    { key: 'Framework Detection', label: 'Detecting Framework' },
    { key: 'Building Image', label: 'Building Docker Image' },
    { key: 'Starting Container', label: 'Starting Container' },
    { key: 'Health Check', label: 'Running Health Checks' },
    { key: 'Deployment Complete', label: 'Deployment Complete' }
  ];

  const getStepStatus = (index: number) => {
    if (status === 'Stopped') return 'completed';
    if (status === 'Running' || status === 'Active') return 'completed';
    
    let currentIndex = 0;
    if (currentStep === 'Queued' || currentStep === 'Initializing') currentIndex = 0;
    else if (currentStep === 'Repository Cloning') currentIndex = 1;
    else if (currentStep === 'Repository Cloned' || currentStep === 'Framework Detection') currentIndex = 2;
    else if (currentStep === 'Building Image') currentIndex = 3;
    else if (currentStep === 'Image Built' || currentStep === 'Starting Container') currentIndex = 4;
    else if (currentStep === 'Health Check') currentIndex = 5;
    else if (currentStep === 'Deployment Complete') currentIndex = 6;
    
    if (status === 'Failed') {
      if (index < currentIndex) return 'completed';
      if (index === currentIndex) return 'error';
      return 'pending';
    }
    
    if (index < currentIndex) return 'completed';
    if (index === currentIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="space-y-4">
      {steps.map((step, idx) => {
        const stepStatus = getStepStatus(idx);
        return (
          <div key={step.key} className="flex items-start gap-4 relative">
            {idx !== steps.length - 1 && (
              <div className={clsx(
                "absolute top-6 left-3 w-0.5 h-full -ml-px",
                stepStatus === 'completed' ? 'bg-emerald-500' : 'bg-slate-700'
              )} />
            )}
            
            <div className="relative z-10 bg-slate-900 rounded-full mt-1">
              {stepStatus === 'completed' && <CheckCircle2 className="w-6 h-6 text-emerald-500" />}
              {stepStatus === 'active' && <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />}
              {stepStatus === 'error' && <AlertCircle className="w-6 h-6 text-red-500" />}
              {stepStatus === 'pending' && <Circle className="w-6 h-6 text-slate-700" />}
            </div>
            
            <div className="pb-4">
              <p className={clsx(
                "font-medium",
                stepStatus === 'completed' ? "text-emerald-400" :
                stepStatus === 'active' ? "text-blue-400" :
                stepStatus === 'error' ? "text-red-400" : "text-slate-500"
              )}>
                {step.label}
              </p>
              {stepStatus === 'error' && error && (
                <p className="text-sm text-red-400/80 mt-1 p-2 bg-red-500/10 rounded border border-red-500/20 font-mono">
                  {error}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const DeploymentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // We only fetch initial data once, socket handles updates
  const { data: deployment, isLoading } = useQuery({
    queryKey: ['deployment', id],
    queryFn: () => deploymentService.getDeployment(id!),
    enabled: !!id,
    refetchOnWindowFocus: false,
    staleTime: Infinity
  });

  const { data: historicalLogs } = useQuery({
    queryKey: ['deploymentLogs', id],
    queryFn: async () => {
      try {
        const rawLogs = await deploymentService.getDeploymentLogs(id!);
        if (rawLogs && typeof rawLogs === 'string') {
          return rawLogs.split('\n').filter(Boolean).map(line => {
            const match = line.match(/^\[(.*?)\] \[(.*?)\] (.*)$/);
            if (match) {
              return { timestamp: match[1], level: match[2] as 'INFO' | 'ERROR' | 'SUCCESS' | 'WARNING' | 'OUTPUT', message: match[3] };
            }
            return { timestamp: new Date().toISOString(), level: 'OUTPUT' as const, message: line };
          });
        }
        return [];
      } catch {
        return [];
      }
    },
    enabled: !!id,
    refetchOnWindowFocus: false,
  });

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [liveStatus, setLiveStatus] = useState<string>('');
  const [liveStep, setLiveStep] = useState<string>('');
  const [livePercentage, setLivePercentage] = useState<number>(0);
  const [liveElapsed, setLiveElapsed] = useState<number>(0);
  const [liveRemaining, setLiveRemaining] = useState<number>(0);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);

  useEffect(() => {
    if (historicalLogs && historicalLogs.length > 0) {
      setLogs(historicalLogs);
    }
  }, [historicalLogs]);

  useEffect(() => {
    if (deployment) {
      setLiveStatus(deployment.status);
      setLiveStep(deployment.currentStep || 'Queued');
      setLivePercentage(deployment.progressPercentage || 0);
      setLiveError(deployment.errorMessage);
      setLiveUrl(deployment.publicUrl?.includes('trycloudflare.com') ? deployment.localUrl : (deployment.publicUrl || deployment.localUrl));
    }
  }, [deployment]);

  useEffect(() => {
    if (!id) return;
    
    socketService.connect();
    socketService.subscribeToDeployment(id);

    const unsubLog = socketService.onLog((log: LogEntry) => {
      setLogs(prev => [...prev, log]);
    });

    const unsubProgress = socketService.onProgress(({ step, percentage }) => {
      setLiveStep(step);
      setLivePercentage(percentage);
    });
    
    const unsubStats = socketService.onStats((data) => {
      setLiveElapsed(data.elapsed);
      setLiveRemaining(data.remaining);
      if (data.currentStep) setLiveStep(data.currentStep);
      if (data.percentage !== undefined) setLivePercentage(data.percentage);
    });

    const unsubStatus = socketService.onStatus(({ status, publicUrl }) => {
      setLiveStatus(status);
      if (publicUrl && !publicUrl.includes('trycloudflare.com')) setLiveUrl(publicUrl);
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
    });

    const unsubError = socketService.onError(({ message }) => {
      setLiveError(message);
      setLiveStatus('Failed');
    });

    const unsubCompleted = socketService.onCompleted(({ url, publicUrl }) => {
      setLiveUrl(publicUrl?.includes('trycloudflare.com') ? url : (publicUrl || url));
    });

    return () => {
      socketService.unsubscribeFromDeployment(id);
      if (unsubLog) unsubLog();
      if (unsubProgress) unsubProgress();
      if (unsubStats) unsubStats();
      if (unsubStatus) unsubStatus();
      if (unsubError) unsubError();
      if (unsubCompleted) unsubCompleted();
    };
  }, [id, queryClient]);

  const stopMutation = useMutation({
    mutationFn: () => deploymentService.stopDeployment(id!),
    onSuccess: () => setLiveStatus('Stopped')
  });

  const startMutation = useMutation({
    mutationFn: () => deploymentService.startDeployment(id!),
    onSuccess: () => setLiveStatus('Running')
  });

  const deleteMutation = useMutation({
    mutationFn: () => deploymentService.deleteDeployment(id!),
    onSuccess: () => navigate('/dashboard/deployments')
  });

  if (!id || id === 'undefined' || id === 'null') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Invalid Deployment ID</h2>
          <p className="text-slate-400 max-w-md mx-auto">
            The deployment ID provided in the URL is invalid.
          </p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => navigate('/dashboard/deployments')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium"
          >
            Go Back to Deployments
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-slate-400 animate-pulse">Fetching deployment data...</p>
      </div>
    );
  }

  if (!deployment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Deployment Not Found</h2>
          <p className="text-slate-400 max-w-md mx-auto">
            We couldn't find the deployment record. It may have been deleted, or the deployment ID is invalid.
          </p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['deployment', id] })}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
          >
            Retry
          </button>
          <button 
            onClick={() => navigate('/dashboard/deployments')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium"
          >
            Go Back to Deployments
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6 max-w-7xl mx-auto">
      <motion.div variants={staggerItem}>
        <Link to="/dashboard/deployments" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Deployments
        </Link>
      </motion.div>

      <motion.div variants={staggerItem} className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
            {deployment.project?.name}
            <StatusBadge status={liveStatus} />
          </h1>
          <p className="text-slate-400 text-sm font-mono">{deployment.id}</p>
        </div>

        <div className="flex items-center gap-3">
          {liveUrl && liveStatus === 'Running' && (
            <a 
              href={liveUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg shadow-lg shadow-blue-500/25 transition-all"
            >
              Open App <ExternalLink className="w-4 h-4" />
            </a>
          )}
          
          {liveStatus === 'Running' && (
            <button 
              onClick={() => stopMutation.mutate()}
              disabled={stopMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg border border-slate-700 transition-colors"
            >
              <Square className="w-4 h-4 fill-current" /> Stop
            </button>
          )}

          {liveStatus === 'Stopped' && (
            <button 
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-medium rounded-lg border border-slate-700 transition-colors"
            >
              <Play className="w-4 h-4 fill-current" /> Start
            </button>
          )}

          <button 
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium rounded-lg border border-red-500/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </motion.div>

      <motion.div variants={staggerItem} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={staggerItem} className="lg:col-span-2 space-y-6">
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-white border-b border-slate-700/50 pb-2 mb-4 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-blue-400" />
              Live Deployment Status
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
               <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Status</p>
                  <p className={clsx("font-semibold", 
                    liveStatus === 'Failed' ? 'text-red-400' : 
                    liveStatus === 'Running' ? 'text-emerald-400' : 'text-blue-400'
                  )}>{liveStatus}</p>
               </div>
               <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Elapsed</p>
                  <p className="text-white font-semibold font-mono">{liveElapsed}s</p>
               </div>
               <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Estimated</p>
                  <p className="text-white font-semibold font-mono">~{liveRemaining}s</p>
               </div>
               <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Progress</p>
                  <p className="text-white font-semibold font-mono">{livePercentage}%</p>
               </div>
            </div>

            <div className="mb-6">
              <ProgressBar percentage={livePercentage} label={liveStep} status={liveStatus} />
            </div>

            <DeploymentTerminal logs={logs} />
          </GlassCard>
        </motion.div>

        <motion.div variants={staggerItem} className="space-y-6">
          <GlassCard className="p-6 space-y-6">
            <h3 className="text-lg font-semibold text-white border-b border-slate-700/50 pb-2">Timeline</h3>
            <DeploymentTimeline status={liveStatus} currentStep={liveStep} error={liveError} />
          </GlassCard>

          <GlassCard className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white border-b border-slate-700/50 pb-2">Configuration</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Framework</span>
                <span className="text-sm font-medium text-white">{deployment.framework || 'Auto-detect'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Branch</span>
                <span className="text-sm font-mono text-white bg-slate-800 px-2 py-0.5 rounded">{deployment.branch}</span>
              </div>
              {deployment.assignedPort && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Port Mapping</span>
                  <span className="text-sm font-mono text-emerald-400">{deployment.assignedPort}:TARGET</span>
                </div>
              )}
              {deployment.commitHash && (
                <div className="flex items-start justify-between gap-2 pt-2 border-t border-slate-700/50">
                  <span className="text-sm text-slate-400 shrink-0 flex items-center gap-1"><GitCommit className="w-3.5 h-3.5" /> Commit</span>
                  <div className="text-right">
                    <code className="text-xs text-blue-400 bg-slate-800 px-2 py-0.5 rounded">{deployment.commitHash}</code>
                    {(deployment as any).commitMessage && (
                      <p className="text-xs text-slate-400 mt-1 italic">{(deployment as any).commitMessage}</p>
                    )}
                    {(deployment as any).authorName && (
                      <p className="text-xs text-slate-500">by {(deployment as any).authorName}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default DeploymentDetails;
