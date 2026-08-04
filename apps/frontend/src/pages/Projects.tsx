import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '../utils/animations';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '../services/projectService';
import { ProjectCard } from '../components/ProjectCard';
import { EmptyState } from '../components/EmptyState';
import { DeleteModal } from '../components/DeleteModal';
import { Search, Filter, Plus, FolderGit2 } from 'lucide-react';
import { CardSkeleton } from '../components/Skeletons';
import { Link } from 'react-router-dom';

const Projects: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterFramework, setFilterFramework] = useState('');
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectService.getProjects
  });

  const deleteMutation = useMutation({
    mutationFn: projectService.deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setDeleteModalOpen(false);
      setProjectToDelete(null);
    }
  });

  const handleDeleteClick = (id: string) => {
    setProjectToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (projectToDelete) {
      deleteMutation.mutate(projectToDelete);
    }
  };

  const filteredProjects = projects?.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.githubUrl.toLowerCase().includes(search.toLowerCase());
    const matchesFramework = filterFramework ? p.framework === filterFramework : true;
    return matchesSearch && matchesFramework;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Projects</h1>
            <p className="text-slate-400">Manage and monitor your deployment projects.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-16">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <EmptyState 
        icon={FolderGit2}
        title="No projects yet"
        description="Get started by creating your first project and deploying your code."
        actionLink="/dashboard/projects/new"
        actionText="Create Project"
      />
    );
  }

  const projectToDeleteName = projects.find(p => p.id === projectToDelete)?.name;

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6">
      <motion.div variants={staggerItem} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Projects</h1>
          <p className="text-slate-400">Manage and monitor your deployment projects.</p>
        </div>
        <Link 
          to="/dashboard/projects/new"
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-lg transition-all shadow-lg shadow-blue-500/25"
        >
          <Plus className="w-4 h-4" /> New Project
        </Link>
      </motion.div>

      <motion.div variants={staggerItem} className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-grow max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search projects..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <select
            value={filterFramework}
            onChange={(e) => setFilterFramework(e.target.value)}
            className="pl-9 pr-8 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer min-w-[160px]"
          >
            <option value="">All Frameworks</option>
            {Array.from(new Set(projects.map(p => p.framework))).map(fw => (
              <option key={fw} value={fw}>{fw}</option>
            ))}
          </select>
        </div>
      </motion.div>

      <motion.div variants={staggerItem} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredProjects?.map(project => (
          <motion.div variants={staggerItem} key={project.id}>
            <ProjectCard 
              project={project} 
              onDeleteClick={handleDeleteClick} 
            />
          </motion.div>
        ))}
      </motion.div>

      {filteredProjects?.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          No projects found matching your search.
        </div>
      )}

      <DeleteModal 
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        isLoading={deleteMutation.isPending}
        projectName={projectToDeleteName}
      />
    </motion.div>
  );
};

export default Projects;
