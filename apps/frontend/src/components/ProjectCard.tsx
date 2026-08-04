import React from 'react';
import { clsx } from 'clsx';
import { GitBranch, Play, Settings, Trash2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Project } from '../services/projectService';
import { GlassCard } from './GlassCard';

interface ProjectCardProps {
  project: Project;
  onDeleteClick: (id: string) => void;
}

export const FrameworkBadge: React.FC<{ framework: string }> = ({ framework }) => {
  const colors: Record<string, string> = {
    'React': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'Next.js': 'bg-slate-800 text-slate-300 border-slate-700',
    'Node.js': 'bg-green-500/10 text-green-400 border-green-500/20',
    'Python': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    'Go': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  };
  const colorClass = colors[framework] || 'bg-slate-700/50 text-slate-300 border-slate-600';

  return (
    <span className={clsx("px-2 py-1 text-xs font-medium rounded-full border", colorClass)}>
      {framework}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors: Record<string, string> = {
    'Draft': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    'Deploying': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'Active': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'Failed': 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  const colorClass = colors[status] || 'bg-slate-700/50 text-slate-300 border-slate-600';

  return (
    <span className={clsx("px-2 py-1 text-xs font-medium rounded-full border flex items-center gap-1.5", colorClass)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      {status}
    </span>
  );
};

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onDeleteClick }) => {
  return (
    <GlassCard className="p-5 flex flex-col h-full hover:border-blue-500/30 transition-colors group">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">{project.name}</h3>
          <div className="flex items-center gap-2">
            <FrameworkBadge framework={project.framework} />
            <StatusBadge status={project.status} />
          </div>
        </div>
        <a 
          href={project.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-400 hover:text-white transition-colors"
          title="View Repository"
        >
          <GitBranch className="w-5 h-5" />
        </a>
      </div>

      <p className="text-sm text-slate-400 line-clamp-2 mb-6 flex-grow">
        {project.description || 'No description provided.'}
      </p>

      <div className="pt-4 border-t border-slate-800/50 flex items-center justify-between mt-auto">
        <div className="text-xs text-slate-500">
          Branch: <span className="text-slate-300 font-mono">{project.branch}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link 
            to={`/dashboard/projects/${project.id}/edit`}
            className="p-1.5 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-800 transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>
          <button 
            onClick={() => onDeleteClick(project.id)}
            className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <Link 
            to={`/dashboard/projects/${project.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Details
          </Link>
          {project.status === 'Active' && project.port && (
            <a
              href={project.publicUrl?.includes('trycloudflare.com') ? `http://localhost:${project.port}` : (project.publicUrl || `http://localhost:${project.port}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open App
            </a>
          )}</div>
      </div>
    </GlassCard>
  );
};
