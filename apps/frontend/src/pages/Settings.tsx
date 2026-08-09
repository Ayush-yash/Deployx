import React from 'react';
import { GlassCard } from '../components/GlassCard';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Calendar, Shield, Trash2, Edit2 } from 'lucide-react';

const Settings: React.FC = () => {
  const { user } = useAuth();

  // @ts-ignore
  const formattedDate = user?.createdAt 
    // @ts-ignore
    ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Unknown';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Profile & Settings</h1>
          <p className="text-slate-400">Manage your account preferences and profile details</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-600/20 transition-colors">
          <Edit2 className="w-4 h-4" />
          Edit Profile
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="p-6 md:col-span-1 text-center space-y-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mx-auto flex items-center justify-center text-3xl font-bold text-white">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{user?.name}</h2>
            {/* @ts-ignore */}
            <p className="text-slate-400">{user?.role || 'User'}</p>
          </div>
        </GlassCard>

        <GlassCard className="p-6 md:col-span-2 space-y-6">
          <h3 className="text-lg font-semibold text-white border-b border-slate-700/50 pb-2">Profile Information</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="text-sm text-slate-400 flex items-center gap-2 mb-1">
                <User className="w-4 h-4" /> Full Name
              </label>
              <p className="text-white font-medium">{user?.name}</p>
            </div>
            
            <div>
              <label className="text-sm text-slate-400 flex items-center gap-2 mb-1">
                <Mail className="w-4 h-4" /> Email Address
              </label>
              <p className="text-white font-medium">{user?.email}</p>
            </div>

            <div>
              <label className="text-sm text-slate-400 flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4" /> Role
              </label>
              <p className="text-white font-medium">
                <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 text-xs uppercase">
                {/* @ts-ignore */}
                {user?.role || 'User'}
                </span>
              </p>
            </div>

            <div>
              <label className="text-sm text-slate-400 flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4" /> Joined
              </label>
              <p className="text-white font-medium">{formattedDate}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-6 border-red-500/20">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-red-400 mb-1">Danger Zone</h3>
            <p className="text-slate-400 text-sm">Permanently delete your account and all associated data.</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors">
            <Trash2 className="w-4 h-4" />
            Delete Account
          </button>
        </div>
      </GlassCard>

      <KubernetesSettingsCard />
    </div>
  );
};

const KubernetesSettingsCard: React.FC = () => {
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState('');
  
  const handleAutoDiscover = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('http://127.0.0.1:3000/api/kubernetes/clusters/auto-discover', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`Success: Discovered cluster "${data.cluster?.name}"`);
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (e: any) {
      setMessage(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassCard className="p-6 border-blue-500/20">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-blue-400 mb-1">Kubernetes Integration</h3>
          <p className="text-slate-400 text-sm">Auto-discover your local kubeconfig to enable deployment to local clusters like Kind or Minikube.</p>
          {message && <p className="text-sm mt-2 font-medium text-emerald-400">{message}</p>}
        </div>
        <button 
          onClick={handleAutoDiscover}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors shrink-0 disabled:opacity-50"
        >
          {loading ? 'Discovering...' : 'Auto-Discover Local Cluster'}
        </button>
      </div>
    </GlassCard>
  );
};

export default Settings;
