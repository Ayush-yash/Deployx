import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { deploymentService } from '../services/deploymentService';
import { GlassCard } from '../components/GlassCard';
import { Loader2, Box, ExternalLink, Activity, Calendar, Server } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../components/ProjectCard';
import { EmptyState } from '../components/EmptyState';
import { ListSkeleton } from '../components/Skeletons';

const Deployments: React.FC = () => {
  const { data: deployments, isLoading } = useQuery({
    queryKey: ['deployments'],
    queryFn: deploymentService.getDeployments,
    refetchInterval: 3000 // Poll every 3s to update status
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Deployments</h1>
            <p className="text-slate-400">View and manage your local container deployments.</p>
          </div>
        </div>
        <div className="mt-8">
          <ListSkeleton items={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Deployments</h1>
          <p className="text-slate-400">View and manage your local container deployments.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {deployments?.map(deployment => (
          <Link to={`/dashboard/deployments/${deployment.id}`} key={deployment.id}>
            <GlassCard className="p-4 hover:border-blue-500/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Box className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">
                    {deployment.project?.name || 'Unknown Project'}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> {deployment.id.substring(0,8)}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(deployment.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <StatusBadge status={deployment.status} />
                
                {deployment.localUrl && (
                  <a 
                    href={deployment.localUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors border border-slate-700"
                  >
                    Open <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </GlassCard>
          </Link>
        ))}

        {(!deployments || deployments.length === 0) && (
          <EmptyState 
            icon={Box}
            title="No Deployments"
            description="You don't have any active or past deployments. Trigger one from a project to get started."
            actionText="Go to Projects"
            actionLink="/dashboard/projects"
          />
        )}
      </div>
    </div>
  );
};

export default Deployments;
