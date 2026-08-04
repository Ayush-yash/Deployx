import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { githubService } from '../../services/githubService';
import { GlassCard } from '../../components/GlassCard';
import { Search, GitBranch, Star, GitFork, Lock, Globe, Loader2, LayoutGrid, List } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

const Repositories: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data: repositories, isLoading, error } = useQuery({
    queryKey: ['github-repositories'],
    queryFn: githubService.getRepositories,
    retry: false
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <GlassCard className="p-8 text-center max-w-lg mx-auto mt-12 border-red-500/20">
        <h2 className="text-xl font-bold text-white mb-2">Could not fetch repositories</h2>
        <p className="text-slate-400 mb-6">Make sure your GitHub account is connected.</p>
        <Link to="/dashboard/github" className="text-blue-400 hover:text-blue-300">Go to Settings</Link>
      </GlassCard>
    );
  }

  const filteredRepos = repositories?.filter(repo => {
    const matchesSearch = repo.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = 
      filterType === 'all' ? true : 
      filterType === 'public' ? !repo.private : 
      filterType === 'private' ? repo.private : true;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">GitHub Repositories</h1>
          <p className="text-slate-400">Browse and import your connected GitHub repositories.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-grow max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Find a repository..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="pl-4 pr-8 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer"
          >
            <option value="all">All Repos</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>

          <div className="flex items-center bg-slate-900/50 border border-slate-700 rounded-lg p-1">
            <button 
              onClick={() => setViewMode('grid')}
              className={clsx("p-1.5 rounded-md transition-colors", viewMode === 'grid' ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300")}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={clsx("p-1.5 rounded-md transition-colors", viewMode === 'list' ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300")}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className={clsx(
        viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" : "space-y-4"
      )}>
        {filteredRepos?.map((repo, i) => (
          <motion.div 
            key={repo.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.05, 0.5) }}
          >
            <Link to={`/dashboard/github/repositories/${repo.full_name}`}>
              <GlassCard className={clsx(
                "hover:border-blue-500/30 transition-colors group cursor-pointer",
                viewMode === 'grid' ? "p-5 flex flex-col h-full" : "p-4 flex items-center justify-between"
              )}>
                
                <div className={clsx(viewMode === 'grid' ? "mb-4" : "flex items-center gap-4 flex-grow")}>
                  <div className="flex items-center gap-2 mb-2">
                    {repo.private ? <Lock className="w-4 h-4 text-amber-400" /> : <Globe className="w-4 h-4 text-emerald-400" />}
                    <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                      {repo.name}
                    </h3>
                  </div>
                  
                  {viewMode === 'grid' && (
                    <p className="text-sm text-slate-400 line-clamp-2 min-h-[2.5rem]">
                      {repo.description || 'No description provided.'}
                    </p>
                  )}
                  
                  {viewMode === 'list' && (
                    <p className="text-sm text-slate-400 truncate max-w-md hidden md:block">
                      {repo.description || 'No description provided.'}
                    </p>
                  )}
                </div>

                <div className={clsx(
                  "flex items-center gap-4 text-xs text-slate-500",
                  viewMode === 'grid' ? "mt-auto pt-4 border-t border-slate-800/50" : "shrink-0"
                )}>
                  {repo.language && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                      {repo.language}
                    </span>
                  )}
                  <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5" /> {repo.stargazers_count}</span>
                  <span className="flex items-center gap-1"><GitBranch className="w-3.5 h-3.5" /> {repo.default_branch}</span>
                  <span className="text-slate-600 hidden sm:inline">
                    Updated {new Date(repo.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </GlassCard>
            </Link>
          </motion.div>
        ))}
      </div>

      {filteredRepos?.length === 0 && (
        <div className="text-center py-16 text-slate-400 border border-dashed border-slate-700/50 rounded-xl bg-slate-900/20">
          No repositories found matching your criteria.
        </div>
      )}
    </div>
  );
};

export default Repositories;
