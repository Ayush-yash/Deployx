import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../services/notificationService';
import { GlassCard } from '../components/GlassCard';
import { EmptyState } from '../components/EmptyState';
import { Bell, CheckCircle, XCircle, Info, AlertTriangle, Check, Loader2, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { ListSkeleton } from '../components/Skeletons';

const Notifications: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getNotifications(100) // fetch more for full page
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS': return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case 'ERROR': return <XCircle className="w-5 h-5 text-red-400" />;
      case 'WARNING': return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      default: return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Bell className="w-6 h-6 text-blue-400" /> Notifications
            </h1>
            <p className="text-slate-400 mt-1">View and manage your deployment alerts and system messages.</p>
          </div>
        </div>
        <ListSkeleton items={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-400" /> Notifications
          </h1>
          <p className="text-slate-400 mt-1">View and manage your deployment alerts and system messages.</p>
        </div>
        
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 text-sm font-medium rounded-lg border border-slate-700 transition-colors"
          >
            <Check className="w-4 h-4" /> Mark All as Read
          </button>
        )}
      </div>

      <GlassCard className="p-0 overflow-hidden">
        {!notifications || notifications.length === 0 ? (
          <div className="py-12">
            <EmptyState 
              icon={Bell}
              title="You're all caught up"
              description="No new notifications. We'll alert you here when there are updates on your deployments."
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {notifications.map(notif => (
              <div 
                key={notif.id}
                className={clsx(
                  "p-6 flex items-start gap-4 relative transition-colors group",
                  !notif.isRead ? "bg-blue-500/5 hover:bg-blue-500/10" : "hover:bg-slate-800/50"
                )}
              >
                {!notif.isRead && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                )}
                
                <div className="shrink-0 mt-1 bg-slate-900 p-2 rounded-full border border-slate-800">
                  {getIcon(notif.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                    <h3 className={clsx("text-base font-semibold", !notif.isRead ? "text-white" : "text-slate-300")}>
                      {notif.title}
                    </h3>
                    <span className="text-xs text-slate-500 flex items-center gap-1 shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(notif.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400">
                    {notif.message}
                  </p>
                </div>
                
                {!notif.isRead && (
                  <button 
                    onClick={() => markAsReadMutation.mutate(notif.id)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors shrink-0 md:opacity-0 md:group-hover:opacity-100"
                    title="Mark as read"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default Notifications;
