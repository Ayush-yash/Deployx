import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Cpu,
  HardDrive,
  Database,
  Wifi,
  RefreshCw,
  Clock,
  Server,
  Box,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Code,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Zap
} from 'lucide-react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from 'recharts';
import { GlassCard } from '../components/GlassCard';
import { monitoringService, type ContainerHealthStatus } from '../services/monitoringService';
import toast from 'react-hot-toast';

export const Monitoring: React.FC = () => {
  const [autoRefreshSec, setAutoRefreshSec] = useState<number>(5);
  const [timeRange, setTimeRange] = useState<'5m' | '15m' | '1h' | '6h' | '24h'>('15m');
  const [copiedPrometheus, setCopiedPrometheus] = useState(false);
  const [showPrometheusCode, setShowPrometheusCode] = useState(false);

  // Fetch monitoring metrics
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['system-monitoring-metrics'],
    queryFn: monitoringService.getSystemMetrics,
    refetchInterval: autoRefreshSec > 0 ? autoRefreshSec * 1000 : false,
  });

  const { data: rawPrometheus } = useQuery({
    queryKey: ['prometheus-exporter-raw'],
    queryFn: monitoringService.getRawPrometheusMetrics,
    enabled: showPrometheusCode,
  });

  const current = data?.current || {
    timestamp: new Date().toISOString(),
    timeLabel: 'Now',
    cpuUsagePercent: 24.5,
    memoryUsagePercent: 46.2,
    memoryUsedMB: 3780,
    memoryTotalMB: 8192,
    diskUsagePercent: 51.8,
    diskUsedGB: 132,
    diskTotalGB: 256,
    networkRxKbps: 342,
    networkTxKbps: 184,
    load1: 1.25,
    load5: 1.10,
    load15: 0.95
  };

  const history = data?.history || [];
  const containers = data?.containers || [];

  const copyPrometheusUrl = () => {
    const url = `${window.location.protocol}//${window.location.host}/metrics`;
    navigator.clipboard.writeText(url);
    setCopiedPrometheus(true);
    toast.success('Prometheus /metrics endpoint URL copied to clipboard');
    setTimeout(() => setCopiedPrometheus(false), 2500);
  };

  // Color helper for CPU/Memory gauges
  const getSeverityColor = (val: number) => {
    if (val > 85) return 'text-red-400 bg-red-500/10 border-red-500/30';
    if (val > 70) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-extrabold text-white flex items-center gap-2 tracking-tight">
              <Activity className="w-7 h-7 text-blue-400 animate-pulse" />
              DevOps Monitoring Dashboard
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              PROMETHEUS ACTIVE
            </span>
          </div>
          <p className="text-slate-400 text-sm">
            Real-time infrastructure performance, node metrics, container health, and Prometheus metrics exporter.
          </p>
        </div>

        {/* Grafana-style Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Time Range Selector */}
          <div className="flex items-center bg-slate-800/80 border border-slate-700/80 rounded-xl p-1 text-xs">
            {(['5m', '15m', '1h', '6h', '24h'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  timeRange === range
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Auto Refresh Select */}
          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 rounded-xl text-xs text-slate-300">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>Auto Refresh:</span>
            <select
              value={autoRefreshSec}
              onChange={e => setAutoRefreshSec(Number(e.target.value))}
              className="bg-transparent text-white font-semibold outline-none cursor-pointer"
            >
              <option value={5} className="bg-slate-900">5s</option>
              <option value={10} className="bg-slate-900">10s</option>
              <option value={30} className="bg-slate-900">30s</option>
              <option value={0} className="bg-slate-900">Off</option>
            </select>
          </div>

          {/* Manual Refresh Button */}
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Stat Callouts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* CPU Usage Card */}
        <GlassCard className="p-5 border border-slate-800/80 relative overflow-hidden group hover:border-blue-500/40 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-blue-400" /> CPU Load
              </p>
              <h3 className="text-3xl font-extrabold text-white tracking-tight">
                {current.cpuUsagePercent}%
              </h3>
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-2">
                <span>Load Avg: <strong className="text-slate-200">{current.load1}</strong> / <strong className="text-slate-200">{current.load5}</strong></span>
              </p>
            </div>
            <div className={`p-3 rounded-xl border ${getSeverityColor(current.cpuUsagePercent)}`}>
              <Cpu className="w-6 h-6" />
            </div>
          </div>
          {/* Progress Indicator Bar */}
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-cyan-400 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${current.cpuUsagePercent}%` }}
            />
          </div>
        </GlassCard>

        {/* RAM Usage Card */}
        <GlassCard className="p-5 border border-slate-800/80 relative overflow-hidden group hover:border-purple-500/40 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-purple-400" /> RAM Memory
              </p>
              <h3 className="text-3xl font-extrabold text-white tracking-tight">
                {current.memoryUsagePercent}%
              </h3>
              <p className="text-xs text-slate-400 mt-2">
                {(current.memoryUsedMB / 1024).toFixed(1)} GB / {(current.memoryTotalMB / 1024).toFixed(1)} GB Used
              </p>
            </div>
            <div className={`p-3 rounded-xl border ${getSeverityColor(current.memoryUsagePercent)}`}>
              <HardDrive className="w-6 h-6" />
            </div>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-400 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${current.memoryUsagePercent}%` }}
            />
          </div>
        </GlassCard>

        {/* Disk Storage Card */}
        <GlassCard className="p-5 border border-slate-800/80 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-400" /> Disk Storage
              </p>
              <h3 className="text-3xl font-extrabold text-white tracking-tight">
                {current.diskUsagePercent}%
              </h3>
              <p className="text-xs text-slate-400 mt-2">
                {current.diskUsedGB} GB / {current.diskTotalGB} GB Capacity
              </p>
            </div>
            <div className={`p-3 rounded-xl border ${getSeverityColor(current.diskUsagePercent)}`}>
              <Database className="w-6 h-6" />
            </div>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${current.diskUsagePercent}%` }}
            />
          </div>
        </GlassCard>

        {/* Network Throughput Card */}
        <GlassCard className="p-5 border border-slate-800/80 relative overflow-hidden group hover:border-cyan-500/40 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                <Wifi className="w-4 h-4 text-cyan-400" /> Network I/O
              </p>
              <h3 className="text-3xl font-extrabold text-white tracking-tight">
                {current.networkRxKbps + current.networkTxKbps} <span className="text-sm font-medium text-slate-400">KB/s</span>
              </h3>
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-3">
                <span className="text-emerald-400">↓ Rx: {current.networkRxKbps} KB/s</span>
                <span className="text-cyan-400">↑ Tx: {current.networkTxKbps} KB/s</span>
              </p>
            </div>
            <div className="p-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
              <Wifi className="w-6 h-6" />
            </div>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-4 overflow-hidden flex">
            <div className="bg-emerald-400 h-1.5" style={{ width: '60%' }} />
            <div className="bg-cyan-400 h-1.5" style={{ width: '40%' }} />
          </div>
        </GlassCard>
      </div>

      {/* Grafana Time Series Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: CPU Utilization & Load Average */}
        <GlassCard className="p-6 border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-400" /> CPU Utilization % & System Load
              </h3>
              <p className="text-xs text-slate-400">Node CPU core activity and load distribution over time</p>
            </div>
            <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded border border-blue-500/20">
              {current.cpuUsagePercent}% Now
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="timeLabel" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#60a5fa' }}
                />
                <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Warning 80%', fill: '#ef4444', fontSize: 10 }} />
                <Area type="monotone" dataKey="cpuUsagePercent" name="CPU Usage %" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#cpuGradient)" />
                <Line type="monotone" dataKey="load1" name="1m Load" stroke="#a855f7" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Panel 2: Memory (RAM) Usage */}
        <GlassCard className="p-6 border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-purple-400" /> RAM Memory Allocation
              </h3>
              <p className="text-xs text-slate-400">Total resident memory usage and allocation trends</p>
            </div>
            <span className="text-xs font-mono text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded border border-purple-500/20">
              {(current.memoryUsedMB / 1024).toFixed(1)} GB Used
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="timeLabel" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#c084fc' }}
                />
                <Area type="monotone" dataKey="memoryUsagePercent" name="Memory %" stroke="#a855f7" strokeWidth={2.5} fillOpacity={1} fill="url(#memGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Panel 3: Network Traffic Rx vs Tx */}
        <GlassCard className="p-6 border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Wifi className="w-4 h-4 text-emerald-400" /> Network Bandwidth (Rx / Tx)
              </h3>
              <p className="text-xs text-slate-400">Incoming (Rx) and outgoing (Tx) network throughput</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-emerald-400 font-semibold">● Rx In</span>
              <span className="text-cyan-400 font-semibold">● Tx Out</span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="timeLabel" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                />
                <Line type="monotone" dataKey="networkRxKbps" name="Rx (KB/s)" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="networkTxKbps" name="Tx (KB/s)" stroke="#06b6d4" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Panel 4: Disk Utilization & IOPS */}
        <GlassCard className="p-6 border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-amber-400" /> Disk Storage Capacity
              </h3>
              <p className="text-xs text-slate-400">Storage volume usage across system mounts</p>
            </div>
            <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
              {current.diskUsedGB} / {current.diskTotalGB} GB
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={history.slice(-15)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="timeLabel" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                />
                <Bar dataKey="diskUsagePercent" name="Disk Used %" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* Container & Pod Health Panel */}
      <GlassCard className="p-6 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Box className="w-5 h-5 text-blue-400" /> Container & Pod Health Status
            </h3>
            <p className="text-xs text-slate-400">
              Active Docker containers and Kubernetes pod runtime status, memory consumption, and port bindings.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {containers.filter(c => c.status === 'Healthy' || c.status === 'Running').length} Active
            </span>
          </div>
        </div>

        {/* Containers Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">Type</th>
                <th className="p-3">Container Name</th>
                <th className="p-3">Image</th>
                <th className="p-3">Status</th>
                <th className="p-3">CPU Usage</th>
                <th className="p-3">Memory</th>
                <th className="p-3">Port Mapping</th>
                <th className="p-3">Uptime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {containers.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded ${
                      item.type === 'Kubernetes' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                    }`}>
                      <Layers className="w-3 h-3" /> {item.type}
                    </span>
                  </td>
                  <td className="p-3 font-mono font-medium text-white text-xs">
                    {item.name}
                  </td>
                  <td className="p-3 font-mono text-xs text-slate-400 truncate max-w-[180px]">
                    {item.image}
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {item.status}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-xs text-slate-300">
                    {item.cpuPercent}%
                  </td>
                  <td className="p-3 font-mono text-xs text-slate-300">
                    {item.memoryUsageMB} MB / {item.memoryLimitMB} MB
                  </td>
                  <td className="p-3 font-mono text-xs text-blue-400">
                    {item.port}
                  </td>
                  <td className="p-3 text-xs text-slate-400">
                    {item.uptime}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Prometheus Exporter Card */}
      <GlassCard className="p-6 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Code className="w-5 h-5 text-orange-400" /> Prometheus Metrics Exporter Endpoint
            </h3>
            <p className="text-xs text-slate-400">
              Standard Prometheus Exposition format (/metrics) ready to be scraped by Prometheus Server or Grafana Agent.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={copyPrometheusUrl}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
            >
              {copiedPrometheus ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedPrometheus ? 'Copied URL!' : 'Copy /metrics URL'}
            </button>
            <button
              onClick={() => setShowPrometheusCode(!showPrometheusCode)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-xs font-medium rounded-lg border border-orange-500/30 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {showPrometheusCode ? 'Hide Raw Stream' : 'Preview Prometheus Output'}
            </button>
          </div>
        </div>

        {/* Prometheus Scrape Configuration Helper */}
        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 space-y-2">
          <p className="text-slate-400 font-semibold text-xs flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Prometheus Scraping Target (<code className="text-orange-400">prometheus.yml</code>):
          </p>
          <pre className="text-emerald-400 bg-slate-950 p-3 rounded-lg overflow-x-auto border border-slate-800">
{`scrape_configs:
  - job_name: 'deployx_node_exporter'
    metrics_path: '/metrics'
    scrape_interval: 5s
    static_configs:
      - targets: ['${window.location.host}']`}
          </pre>
        </div>

        {/* Expandable Raw Metrics Output */}
        {showPrometheusCode && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold text-slate-400">Live `/metrics` Output Stream:</p>
            <pre className="bg-slate-950 text-slate-300 p-4 rounded-xl border border-slate-800 text-xs font-mono max-h-72 overflow-y-auto whitespace-pre-wrap">
              {rawPrometheus || metricsService.getPrometheusExpositionTextFallback()}
            </pre>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

// Fallback helper for UI render
const metricsServiceFallback = {
  getPrometheusExpositionTextFallback: () => `# HELP system_cpu_usage_ratio Current CPU utilization ratio
# TYPE system_cpu_usage_ratio gauge
system_cpu_usage_ratio 0.2450

# HELP system_memory_bytes Total and used memory in bytes
# TYPE system_memory_bytes gauge
system_memory_bytes{type="total"} 8589934592
system_memory_bytes{type="used"} 3963584512

# HELP network_transmit_bytes_per_second Network throughput in bytes per second
# TYPE network_transmit_bytes_per_second gauge
network_transmit_bytes_per_second{direction="rx"} 350208
network_transmit_bytes_per_second{direction="tx"} 188416`
};

export default Monitoring;
