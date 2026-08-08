import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { githubService } from '../services/githubService';
import { Loader2 } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';

const GitHubCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get('code');

  const [isPending, setIsPending] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const hasConnected = React.useRef(false);

  useEffect(() => {
    let isMounted = true;
    
    if (!code) {
      navigate('/dashboard/github');
      return;
    }

    if (hasConnected.current) return;
    hasConnected.current = true;

    const connect = async () => {
      try {
        await githubService.connectCallback(code);
        if (isMounted) navigate('/dashboard/github');
      } catch (err: any) {
        if (isMounted) {
          setError(err.response?.data?.message ? new Error(err.response.data.message) : err);
          setIsPending(false);
        }
      }
    };

    connect();

    return () => {
      isMounted = false;
    };
  }, [code, navigate]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <GlassCard className="p-8 max-w-md w-full text-center space-y-6">
        <h2 className="text-xl font-bold text-white">Connecting to GitHub...</h2>
        {isPending && !error && (
          <div className="flex flex-col items-center gap-4 text-blue-400">
            <Loader2 className="w-10 h-10 animate-spin" />
            <p className="text-sm">Exchanging secure token with GitHub.</p>
          </div>
        )}
        {error && (
          <div className="text-red-400 space-y-4">
            <p className="font-semibold">Connection failed</p>
            <p className="text-sm opacity-80">{error.message || 'An unknown error occurred'}</p>
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
