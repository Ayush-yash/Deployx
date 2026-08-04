import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '../services/projectService';
import { ProjectForm } from '../components/ProjectForm';
import { Loader2 } from 'lucide-react';

const EditProject: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: project, isLoading } = useQuery({
    queryKey: ['projects', id],
    queryFn: () => projectService.getProject(id!),
    enabled: !!id
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => projectService.updateProject(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects', id] });
      navigate('/dashboard/projects');
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!project) return <div>Project not found</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Edit Project: {project.name}</h1>
        <p className="text-slate-400">Update your project configuration and deployment settings.</p>
      </div>

      <ProjectForm 
        initialData={project}
        onSubmit={async (data) => { await updateMutation.mutateAsync(data); }}
        isLoading={updateMutation.isPending}
        isEdit
      />
    </div>
  );
};

export default EditProject;
