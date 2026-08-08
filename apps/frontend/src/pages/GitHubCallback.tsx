import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { githubService } from '../services/githubService';
import { Loader2 } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';

const GitHubCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get('code');

  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: (code: string) => githubService.connectCallback(code),
    onSuccess: () => {
      navigate('/dashboard/github');
    },
  });

  const hasMutated = React.useRef(false);

  useEffect(() => {
    if (code && !hasMutated.current) {
      hasMutated.current = true;
      mutate(code);
    } else if (!code) {
      navigate('/dashboard/github');
    }
  }, [code, mutate, navigate]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <GlassCard className="p-8 max-w-md w-full text-center space-y-6">
        <h2 className="text-xl font-bold text-white">Connecting to GitHub...</h2>
        {isPending && (
          <div className="flex flex-col items-center gap-4 text-blue-400">
            <Loader2 className="w-10 h-10 animate-spin" />
            <p className="text-sm">Exchanging secure token with GitHub.</p>
          </div>
        )}
        {isError && (
          <div className="text-red-400 space-y-4">
            <p className="font-semibold">Connection failed</p>
            <p className="text-sm opacity-80">{error?.message || 'An unknown error occurred'}</p>
            <button 
              onClick={() => navigate('/dashboard/github')}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default GitHubCallback;
