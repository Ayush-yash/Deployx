import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { deploymentService } from '../services/deploymentService';
import { Loader2 } from 'lucide-react';

const Logs: React.FC = () => {
  const navigate = useNavigate();

  const { data: deployments, isLoading } = useQuery({
    queryKey: ['deployments'],
    queryFn: () => deploymentService.getDeployments()
  });

  useEffect(() => {
    if (!isLoading) {
      if (deployments && deployments.length > 0) {
        // Redirect to the most recent deployment
        navigate(`/dashboard/deployments/${deployments[0].id}`, { replace: true });
      } else {
        // Redirect to deployments list if none exist
        navigate('/dashboard/deployments', { replace: true });
      }
    }
  }, [deployments, isLoading, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      <p className="text-slate-400 animate-pulse">Loading logs...</p>
    </div>
  );
};

export default Logs;
