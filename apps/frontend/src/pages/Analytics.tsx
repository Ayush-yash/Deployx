import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/analyticsService';
import { GlassCard } from '../components/GlassCard';
import { Activity, Box, CheckCircle2, Clock, Calendar, BarChart3, TrendingUp, Search } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { ChartSkeleton, Skeleton, ListSkeleton } from '../components/Skeletons';
import { StatusBadge } from '../components/ProjectCard';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Link } from 'react-router-dom';

const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6'];

const StatCard: React.FC<{ title: string; value: string | number | undefined; icon: any; color: string; trend?: string; loading?: boolean }> = ({ title, value, icon: Icon, color, trend, loading }) => (
  <GlassCard className="p-5 flex items-start justify-between">
    <div>
      <p className="text-slate-400 text-sm mb-1">{title}</p>
      {loading ? <Skeleton className="w-16 h-8 mt-1" /> : <h3 className="text-2xl font-bold text-white">{value}</h3>}
      {trend && <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {trend}</p>}
    </div>
    <div className={`p-3 rounded-xl ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
  </GlassCard>
);

const Analytics: React.FC = () => {
  const [dateRange, setDateRange] = useState<'today' | '7days' | '30days' | 'all'>('7days');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const getDates = () => {
    const today = new Date();
    if (dateRange === 'today') return { start: startOfDay(today).toISOString(), end: endOfDay(today).toISOString() };
    if (dateRange === '7days') return { start: startOfDay(subDays(today, 7)).toISOString(), end: endOfDay(today).toISOString() };
    if (dateRange === '30days') return { start: startOfDay(subDays(today, 30)).toISOString(), end: endOfDay(today).toISOString() };
    return { start: undefined, end: undefined };
  };

  const { start, end } = getDates();

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['analytics-summary', dateRange],
    queryFn: () => analyticsService.getSummary(start, end)
  });

  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ['analytics-history', statusFilter, search],
    queryFn: () => analyticsService.getHistory(statusFilter, search)
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-400" /> Analytics Dashboard
          </h1>
          <p className="text-slate-400 text-sm">Monitor your deployment activity and project metrics.</p>
        </div>

        <select 
          value={dateRange} 
          onChange={(e) => setDateRange(e.target.value as any)}
          className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none"
        >
          <option value="today">Today</option>
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="all">All Time</option>
        </select>
      </div>

        {loadingSummary ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard loading={true} title="Total Projects" value={0} icon={Box} color="bg-blue-500/20" />
            <StatCard loading={true} title="Total Deployments" value={0} icon={Activity} color="bg-purple-500/20" />
            <StatCard loading={true} title="Success Rate" value={0} icon={CheckCircle2} color="bg-emerald-500/20" />
            <StatCard loading={true} title="Avg Duration" value={0} icon={Clock} color="bg-orange-500/20" />
          </div>
        ) : summary ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Total Projects" value={summary.totalProjects} icon={Box} color="bg-blue-500/20" />
            <StatCard title="Total Deployments" value={summary.totalDeployments} icon={Activity} color="bg-purple-500/20" trend="+12% this week" />
            <StatCard title="Success Rate" value={`${summary.successRate}%`} icon={CheckCircle2} color="bg-emerald-500/20" />
            <StatCard title="Avg Duration" value={`${summary.avgDuration}s`} icon={Clock} color="bg-orange-500/20" />
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <GlassCard className="p-6 lg:col-span-2">
            <h3 className="text-lg font-bold text-white mb-6">Deployments Over Time</h3>
            <div className="h-[300px] w-full">
              {loadingSummary ? (
                <ChartSkeleton />
              ) : !summary?.deploymentsOverTime || summary.deploymentsOverTime.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 text-sm">No data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={summary.deploymentsOverTime} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="date" stroke="#94a3b8" tick={{fontSize: 12}} tickFormatter={(val) => format(new Date(val), 'MMM dd')} />
                    <YAxis stroke="#94a3b8" tick={{fontSize: 12}} allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                      itemStyle={{ color: '#3b82f6' }}
                      labelFormatter={(val) => format(new Date(val), 'MMM dd, yyyy')}
                    />
                    <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-lg font-bold text-white mb-6">Status Distribution</h3>
            <div className="h-[300px] w-full">
              {loadingSummary ? (
                <div className="flex justify-center items-center h-full">
                  <Skeleton className="w-48 h-48 rounded-full" />
                </div>
              ) : summary?.statusDistribution && summary.statusDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={summary.statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {summary.statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-sm">No data available</div>
              )}
            </div>
          </GlassCard>
        </div>

      <GlassCard className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-bold text-white">Deployment History</h3>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search projects or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-lg pl-10 pr-4 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none min-w-[120px]"
            >
              <option value="All">All Status</option>
              <option value="Running">Running</option>
              <option value="Stopped">Stopped</option>
              <option value="Failed">Failed</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-300">
            <thead className="text-xs text-slate-400 uppercase bg-slate-900/50">
              <tr>
                <th className="px-6 py-3 rounded-tl-lg">Project</th>
                <th className="px-6 py-3">ID</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Framework</th>
                <th className="px-6 py-3">Duration</th>
                <th className="px-6 py-3 rounded-tr-lg">Date</th>
              </tr>
            </thead>
            <tbody>
              {loadingHistory ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8">
                    <ListSkeleton items={3} />
                  </td>
                </tr>
              ) : history?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No deployments found matching filters.</td>
                </tr>
              ) : (
                history?.map((deployment) => (
                  <tr key={deployment.id} className="border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">
                      {deployment.project?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      <Link to={`/dashboard/deployments/${deployment.id}`} className="text-blue-400 hover:underline">
                        {deployment.id.substring(0,8)}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={deployment.status} />
                    </td>
                    <td className="px-6 py-4">
                      {deployment.framework || '-'}
                    </td>
                    <td className="px-6 py-4">
                      {deployment.duration ? `${deployment.duration}s` : '-'}
                    </td>
                    <td className="px-6 py-4 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {format(new Date(deployment.createdAt), 'MMM dd, HH:mm')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};

export default Analytics;
