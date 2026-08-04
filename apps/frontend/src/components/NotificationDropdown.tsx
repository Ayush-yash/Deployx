import React, { useEffect, useState, useRef } from 'react';
import { Bell, CheckCircle, XCircle, Info, AlertTriangle, Check, Trash2, Clock } from 'lucide-react';
import { notificationService, type Notification } from '../services/notificationService';
import { socketService } from '../services/socketService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getNotifications(10)
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    socketService.connect();
    socketService.onNotification((newNotification) => {
      queryClient.setQueryData<Notification[]>(['notifications'], (old) => {
        if (!old) return [newNotification];
        return [newNotification, ...old].slice(0, 50); // Keep local state small
      });
      
      if (newNotification.type === 'SUCCESS') {
        toast.success(newNotification.title);
      } else if (newNotification.type === 'ERROR') {
        toast.error(newNotification.title);
      } else {
        toast(newNotification.title, { icon: 'ℹ️' });
      }
    });

    return () => {
      // Don't disconnect socket fully because other parts might use it, just off the listener
      // Actually Topbar is always mounted, so it's fine.
    };
  }, [queryClient]);

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<Notification[]>(['notifications'], (old) => {
        if (!old) return old;
        return old.map(n => n.id === id ? { ...n, isRead: true } : n);
      });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.setQueryData<Notification[]>(['notifications'], (old) => {
        if (!old) return old;
        return old.map(n => ({ ...n, isRead: true }));
      });
    }
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'ERROR': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'WARNING': return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      default: return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-slate-900"></span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute -right-2 sm:right-0 mt-2 w-[calc(100vw-1rem)] sm:w-80 max-w-sm glass-panel rounded-xl shadow-2xl overflow-hidden z-50 origin-top-right"
          >
            <div className="p-3 flex items-center justify-between border-b border-white/5 bg-slate-900/80 backdrop-blur">
              <h3 className="font-semibold text-white">Notifications</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={() => markAllAsReadMutation.mutate()}
                  disabled={markAllAsReadMutation.isPending}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                >
                  <Check className="w-3 h-3" /> Mark all read
                </button>
              )}
            </div>
            
            <div className="max-h-96 overflow-y-auto hide-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  No notifications yet.
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      className={clsx(
                        "p-3 transition-colors flex gap-3 relative group cursor-pointer",
                        !notif.isRead ? "bg-blue-500/10 hover:bg-blue-500/20" : "hover:bg-slate-800/50"
                      )}
                      onClick={() => !notif.isRead && markAsReadMutation.mutate(notif.id)}
                    >
                      {!notif.isRead && (
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500 rounded-r shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                      )}
                      <div className="mt-0.5 shrink-0">
                        {getIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <p className={clsx("text-sm font-medium truncate", !notif.isRead ? "text-white" : "text-slate-300")}>
                            {notif.title}
                          </p>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2">
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(notif.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {!notif.isRead && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsReadMutation.mutate(notif.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-all shrink-0"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-2 border-t border-white/5 bg-slate-900/80 backdrop-blur text-center">
              <Link 
                to="/dashboard/notifications" 
                onClick={() => setIsOpen(false)}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium"
              >
                View All Notifications
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
