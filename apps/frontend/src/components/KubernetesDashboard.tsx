import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GlassCard } from './GlassCard';
import { Play, RefreshCw, Trash2, HardDrive, Cpu, Activity, Plus } from 'lucide-react';

export const KubernetesDashboard: React.FC<{ projectId: string }> = ({ projectId }) => {
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useQuery({
    queryKey: ['k8s-status', projectId],
    queryFn: async () => {
      const res = await fetch(`http://127.0.0.1:3000/api/kubernetes/project/${projectId}/status`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch status');
      return res.json();
    },
    refetchInterval: 5000 // poll every 5s
  });

  const { data: clusters } = useQuery({
    queryKey: ['k8s-clusters'],
    queryFn: async () => {
      const res = await fetch(`http://127.0.0.1:3000/api/kubernetes/clusters`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) return [];
      return res.json();
    }
  });

  const linkMutation = useMutation({
    mutationFn: async (clusterId: string) => {
      const res = await fetch(`http://127.0.0.1:3000/api/kubernetes/link`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ projectId, clusterId })
      });
      if (!res.ok) throw new Error('Failed to link cluster');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['k8s-status', projectId] });
    }
  });

  if (isLoading) return <div className="p-4"><RefreshCw className="animate-spin w-6 h-6 text-blue-500" /></div>;

  return (
    <GlassCard className="p-6 mt-6 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-700/50 pb-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-purple-400" /> Kubernetes
        </h3>
        
        {clusters && clusters.length > 0 && (
          <div className="flex items-center gap-2">
            <select 
              className="bg-slate-800 text-sm text-slate-300 rounded border border-slate-700 p-2 outline-none"
              onChange={(e) => linkMutation.mutate(e.target.value)}
              defaultValue=""
            >
              <option value="" disabled>Link Cluster...</option>
              {clusters.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!status?.pods && (
        <div className="text-slate-400 text-sm">
          No cluster linked or application is not deployed to Kubernetes yet.
        </div>
      )}

      {status?.pods && (
        <div>
          <h4 className="text-md font-medium text-slate-300 mb-3 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400" /> Pods
          </h4>
          <div className="space-y-3">
            {status.pods.length === 0 ? (
              <p className="text-sm text-slate-500">No pods running.</p>
            ) : (
              status.pods.map((pod: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${pod.status === 'Running' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <span className="text-slate-200 font-mono text-sm">{pod.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {pod.status}</span>
                    <span>Restarts: {pod.restarts}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-700/50">
            <button className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sm text-white rounded transition-colors flex items-center gap-2">
              <RefreshCw className="w-3 h-3" /> Restart App
            </button>
            <button className="px-3 py-1.5 bg-red-900/50 hover:bg-red-900 text-sm text-red-200 rounded transition-colors flex items-center gap-2">
              <Trash2 className="w-3 h-3" /> Delete Deployment
            </button>
          </div>
        </div>
      )}
    </GlassCard>
  );
};
