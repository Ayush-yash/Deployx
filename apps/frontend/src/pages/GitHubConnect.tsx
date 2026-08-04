import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { githubService } from '../services/githubService';
import { GlassCard } from '../components/GlassCard';
import { GitBranch, Link as LinkIcon, Unlink, ExternalLink, Loader2, Users, BookOpen, Lock, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const GitHubConnect: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['github-profile'],
    queryFn: githubService.getProfile,
    retry: false
  });

  const connectMutation = useMutation({
    mutationFn: githubService.getAuthUrl,
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to initiate GitHub connection');
    }
  });

  const disconnectMutation = useMutation({
    mutationFn: githubService.disconnect,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['github-profile'] });
      toast.success('GitHub disconnected successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to disconnect GitHub');
    }
  });

  const isConnected = !!profile;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">GitHub Integration</h1>
        <p className="text-slate-400">Connect your GitHub account to seamlessly import and deploy repositories.</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <GlassCard className="p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center border-4 border-slate-700/50 overflow-hidden shrink-0">
                {isConnected && profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="GitHub Avatar" className="w-full h-full object-cover" />
                ) : (
                  <GitBranch className="w-10 h-10 text-slate-400" />
                )}
              </div>
              
              <div>
                <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                  {isConnected ? (profile.displayName || profile.username) : 'Not Connected'}
                  {isConnected && <ShieldCheck className="w-5 h-5 text-emerald-400" />}
                </h2>
                <p className="text-slate-400 text-sm mb-3">
                  {isConnected ? `@${profile.username} • Connected ${new Date(profile.connectedAt).toLocaleDateString()}` : 'Connect to browse repositories'}
                </p>
                {isConnected && (
                  <div className="flex items-center gap-4 text-sm font-medium">
                    <span className="text-slate-300 flex items-center gap-1.5"><Users className="w-4 h-4 text-slate-500" /> {profile.followers || 0} Followers</span>
                    <span className="text-slate-300 flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-slate-500" /> {profile.public_repos || 0} Public</span>
                    {profile.total_private_repos !== undefined && (
                      <span className="text-slate-300 flex items-center gap-1.5"><Lock className="w-4 h-4 text-slate-500" /> {profile.total_private_repos} Private</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 w-full md:w-auto">
              {!isConnected ? (
                <button
                  onClick={() => connectMutation.mutate()}
                  disabled={connectMutation.isPending}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-lg transition-colors disabled:opacity-50"
                >
                  {connectMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <GitBranch className="w-5 h-5" />}
                  Connect GitHub
                </button>
              ) : (
                <>
                  <Link
                    to="/dashboard/github/repositories"
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-blue-500/25"
                  >
                    <BookOpen className="w-4 h-4" /> Browse Repositories
                  </Link>
                  <button
                    onClick={() => disconnectMutation.mutate()}
                    disabled={disconnectMutation.isPending}
                    className="flex items-center justify-center gap-2 px-6 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-slate-800/50 border border-transparent hover:border-red-500/20 rounded-lg transition-colors font-medium"
                  >
                    {disconnectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
                    Disconnect Account
                  </button>
                </>
              )}
            </div>
          </div>
        </GlassCard>
      </motion.div>
      
      {!isConnected && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          {[
             { title: 'Secure OAuth', desc: 'DeployX only requests necessary read scopes. Your code stays private.' },
             { title: '1-Click Import', desc: 'Instantly view your branches, commits, and start a deployment.' },
             { title: 'Auto-Sync', desc: 'Connect once and DeployX stays synchronized with your GitHub activity.' }
          ].map((feature, i) => (
             <GlassCard key={i} className="p-5 text-center">
               <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
               <p className="text-sm text-slate-400">{feature.desc}</p>
             </GlassCard>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default GitHubConnect;
