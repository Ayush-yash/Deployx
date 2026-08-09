import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderGit2, Server, BarChart3, Activity, GitBranch, Terminal, Settings, Cloud } from 'lucide-react';
import { cn } from '../utils/cn';
import { motion } from 'framer-motion';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Projects', path: '/dashboard/projects', icon: FolderGit2 },
  { name: 'Deployments', path: '/dashboard/deployments', icon: Server },
  { name: 'Analytics', path: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Monitoring', path: '/dashboard/monitoring', icon: Activity },
  { name: 'GitHub', path: '/dashboard/github', icon: GitBranch },
  { name: 'Logs', path: '/dashboard/logs', icon: Terminal },
  { name: 'Settings', path: '/dashboard/settings', icon: Settings },
];

const Sidebar: React.FC = () => {
  const location = useLocation();

  return (
    <div className="w-64 glass-panel border-r border-white/5 hidden md:flex flex-col h-screen shrink-0 relative z-20">
      <div className="h-16 flex items-center px-6 border-b border-white/5">
        <Cloud className="w-8 h-8 text-blue-500 mr-2" />
        <span className="text-xl font-bold tracking-tight text-white">DeployX</span>
      </div>
      
      <div className="flex-1 overflow-y-auto py-6 px-3 space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              to={item.path}
              className={cn(
                'flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative group',
                isActive ? 'text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-blue-600/20 border border-blue-500/30 rounded-lg"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <Icon className={cn('w-5 h-5 mr-3 relative z-10', isActive ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300')} />
              <span className="relative z-10">{item.name}</span>
            </Link>
          );
        })}
      </div>
      
    </div>
  );
};

export default Sidebar;
