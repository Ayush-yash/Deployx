import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { githubService } from '../../services/githubService';
import { GlassCard } from '../../components/GlassCard';
import { Loader2, GitBranch, Lock, Globe, ArrowLeft, GitCommit, Play, Calendar, Star, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const RepositoryDetails: React.FC = () => {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const navigate = useNavigate();

  const { data: details, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['github-repo', owner, repo],
    queryFn: () => githubService.getRepositoryDetails(owner!, repo!),
    enabled: !!owner && !!repo,
  });

  const { data: branches, isLoading: isLoadingBranches } = useQuery({
    queryKey: ['github-branches', owner, repo],
    queryFn: () => githubService.getBranches(owner!, repo!),
    enabled: !!owner && !!repo,
  });

  if (isLoadingDetails) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!details) {
    return <div className="text-center py-12 text-slate-400">Repository not found.</div>;
  }

  return (
    <div className="space-y-6">
      <Link to="/dashboard/github/repositories" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Repositories
      </Link>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              {details.owner?.avatar_url && (
                <img src={details.owner.avatar_url} alt={owner} className="w-8 h-8 rounded-full border border-slate-700" />
              )}
              {details.full_name}
            </h1>
            <span className={`px-2 py-1 text-xs font-medium rounded-full border flex items-center gap-1.5 ${details.private ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
              {details.private ? <Lock className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
              {details.private ? 'Private' : 'Public'}
            </span>
          </div>
          <p className="text-slate-400 max-w-2xl">{details.description || 'No description provided.'}</p>
        </div>

        <div className="flex items-center gap-3">
          <a 
            href={details.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 font-medium rounded-lg border border-slate-700 transition-colors"
          >
            <GitBranch className="w-4 h-4" /> View on GitHub
          </a>
          <button 
            onClick={() => navigate(`/dashboard/projects/new?githubUrl=${encodeURIComponent(details.html_url)}&repoName=${encodeURIComponent(details.name)}`)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-lg shadow-lg shadow-blue-500/25 transition-all group relative"
          >
            <Play className="w-4 h-4 fill-current" /> Import & Deploy
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="p-6 lg:col-span-2 space-y-6">
          <h3 className="text-lg font-semibold text-white border-b border-slate-700/50 pb-2 flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-blue-400" />
            Branches
          </h3>

          {isLoadingBranches ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {branches?.map(branch => (
                <div key={branch.name} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <GitCommit className="w-4 h-4 text-slate-500" />
                    <span className="font-mono text-sm text-blue-300">{branch.name}</span>
                    {branch.name === details.default_branch && (
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">Default</span>
                    )}
                    {branch.protected && (
                      <ShieldCheck className="w-4 h-4 text-emerald-500" title="Protected Branch" />
                    )}
                  </div>
                  <div className="font-mono text-xs text-slate-500">
                    {branch.commit.sha.substring(0, 7)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <div className="space-y-6">
          <GlassCard className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white border-b border-slate-700/50 pb-2">About</h3>
            
            <div className="space-y-3">
              {details.language && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Language</span>
                  <span className="text-sm font-medium text-white">{details.language}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Stars</span>
                <span className="text-sm font-medium text-white flex items-center gap-1"><Star className="w-3.5 h-3.5" /> {details.stargazers_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Open Issues</span>
                <span className="text-sm font-medium text-white flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {details.open_issues_count}</span>
              </div>
            </div>
          </GlassCard>
          
          <GlassCard className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white border-b border-slate-700/50 pb-2">Clone URL</h3>
            <div className="flex items-center bg-slate-900 rounded border border-slate-700 p-2 overflow-x-auto">
              <code className="text-xs text-slate-300 whitespace-nowrap">{details.clone_url || `https://github.com/${details.full_name}.git`}</code>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default RepositoryDetails;

// Added for missing import
function ShieldCheck(props: any) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>;
}
