import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, staggerItem } from '../utils/animations';
import { GlassCard } from '../components/GlassCard';
import { ChartCard } from '../components/ChartCard';
import { FolderKanban, Rocket, AlertCircle, Activity, GitBranch, ArrowRight, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChartSkeleton, Skeleton } from '../components/Skeletons';
import { githubService } from '../services/githubService';
import { analyticsService } from '../services/analyticsService';
import { formatDistanceToNow } from 'date-fns';

const DashboardHome: React.FC = () => {
  const { data: githubProfile } = useQuery({
    queryKey: ['github-profile'],
    queryFn: githubService.getProfile,
    retry: false
  });

  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: () => analyticsService.getSummary()
  });

  const { data: history, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['analytics-history'],
    queryFn: () => analyticsService.getHistory('All')
  });

  const stats = [
    { title: 'Total Projects', value: summary?.totalProjects ?? '-', icon: FolderKanban, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { title: 'Successful Deployments', value: summary?.successRate ? `${summary.successRate}%` : '-', icon: Rocket, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { title: 'Failed Deployments', value: summary?.failedDeployments ?? '-', icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-400/10' },
    { title: 'Active Services', value: summary?.runningDeployments ?? '-', icon: Activity, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  ];

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
          <p className="text-gray-400 text-sm mt-1">Welcome back! Here's what's happening today.</p>
        </div>
        <Link to="/dashboard/projects/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/20">
          New Deployment
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div key={stat.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
            <GlassCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">{stat.title}</p>
                  <div className="mt-2 h-9 flex items-center">
                    {isSummaryLoading ? (
                      <Skeleton className="w-16 h-8" />
                    ) : (
                      <span className="text-3xl font-bold text-white">{stat.value}</span>
                    )}
                  </div>
                </div>
                <div className={`w-12 h-12 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <motion.div variants={staggerItem} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GitHub Widget */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <GitBranch className="w-5 h-5" /> GitHub Integration
            </h3>
            {githubProfile ? (
              <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded-full border border-emerald-500/20 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Connected
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-slate-800 text-slate-400 text-xs font-medium rounded-full border border-slate-700">
                Disconnected
              </span>
            )}
          </div>

          {githubProfile ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                {githubProfile.avatarUrl ? (
                  <img src={githubProfile.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                    <GitBranch className="w-5 h-5 text-slate-400" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-white">{githubProfile.displayName || githubProfile.username}</p>
                  <p className="text-xs text-slate-400">@{githubProfile.username}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Public Repos</span>
                <span className="text-white font-medium">{githubProfile.public_repos || 0}</span>
              </div>
              <Link 
                to="/dashboard/github/repositories"
                className="w-full flex items-center justify-center gap-2 px-4 py-2 mt-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-sm font-medium rounded-lg border border-blue-500/30 transition-colors"
              >
                Browse Repositories <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="text-center py-4 space-y-4">
              <p className="text-sm text-slate-400">Connect your GitHub account to easily import and deploy repositories.</p>
              <Link 
                to="/dashboard/github"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-900 text-sm font-bold rounded-lg hover:bg-slate-100 transition-colors"
              >
                <GitBranch className="w-4 h-4" /> Connect Account
              </Link>
            </div>
          )}
        </GlassCard>

        {/* Chart */}
        <div className="lg:col-span-2">
          <ChartCard title="Deployment Activity">
            {isSummaryLoading ? (
              <ChartSkeleton />
            ) : !summary?.deploymentsOverTime || summary.deploymentsOverTime.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-slate-500">
                No deployment data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={summary.deploymentsOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorDeploy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" tick={{fill: 'rgba(255,255,255,0.5)', fontSize: 12}} axisLine={false} tickLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.5)" tick={{fill: 'rgba(255,255,255,0.5)', fontSize: 12}} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorDeploy)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-1">
          <GlassCard variant="panel" className="h-full">
            <h3 className="text-lg font-semibold text-white mb-6">Recent Activity</h3>
            <div className="space-y-6">
              {isHistoryLoading ? (
                <div className="space-y-4">
                  <Skeleton className="w-full h-12" />
                  <Skeleton className="w-full h-12" />
                  <Skeleton className="w-full h-12" />
                </div>
              ) : !history || history.length === 0 ? (
                <div className="text-sm text-slate-500 text-center">No recent activity</div>
              ) : (
                history.slice(0, 5).map((deployment) => (
                  <div key={deployment.id} className="flex items-start">
                    <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${deployment.status === 'Running' || deployment.status === 'Active' || deployment.status === 'Completed' ? 'bg-emerald-500' : deployment.status === 'Failed' ? 'bg-red-500' : 'bg-blue-500 animate-pulse'}`} />
                    <div className="ml-4 flex-1">
                      <p className="text-sm font-medium text-white">{deployment.project?.name || 'Unknown Project'}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {deployment.status} • {deployment.branch}
                      </p>
                    </div>
                    <div className="ml-auto text-xs text-gray-500">
                      {formatDistanceToNow(new Date(deployment.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                ))
              )}
            </div>
            {history && history.length > 5 && (
              <Link to="/dashboard/deployments" className="block text-center w-full mt-6 py-2 border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                View All
              </Link>
            )}
          </GlassCard>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DashboardHome;
