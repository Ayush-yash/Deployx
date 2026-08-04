import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { Topbar } from '../components/Topbar';
import { socketService } from '../services/socketService';
import { useQueryClient } from '@tanstack/react-query';

const DashboardLayout: React.FC = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    socketService.connect();

    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
    };

    socketService.onStatus(handleUpdate);
    socketService.onCompleted(handleUpdate);
    socketService.onProjectUpdated(handleUpdate);

    return () => {
      // We don't necessarily want to disconnect completely here if other components use it,
      // but we should remove these specific listeners. 
      // socketService.offAll() might remove too much, but for now we'll just let it be 
      // or we can add offStatus, offCompleted.
    };
  }, [queryClient]);
  return (
    <div className="min-h-screen flex bg-slate-950">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Topbar onMenuClick={() => {}} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 z-10 relative">
          {/* Subtle background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-2xl bg-blue-500/5 blur-[150px] pointer-events-none rounded-full" />
          <div className="relative z-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
