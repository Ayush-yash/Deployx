import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '../services/projectService';
import { deploymentService } from '../services/deploymentService';
import { ProjectForm } from '../components/ProjectForm';
import { Loader2 } from 'lucide-react';

const CreateProject: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const githubUrl = searchParams.get('githubUrl');
  const repoName = searchParams.get('repoName');
  const queryClient = useQueryClient();

  const initialData = githubUrl ? {
    githubUrl,
    name: repoName || '',
    branch: 'main'
  } : undefined;

  const deployMutation = useMutation({
    mutationFn: (projectId: string) => deploymentService.deployProject(projectId),
    onSuccess: (data) => {
      if (data?.deploymentId) {
        navigate(`/dashboard/deployments/${data.deploymentId}`);
      } else {
        throw new Error('Invalid deployment ID returned');
      }
    }
  });

  const createMutation = useMutation({
    mutationFn: projectService.createProject,
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      // Automatically trigger deployment
      await deployMutation.mutateAsync(data.id);
    }
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Create Project</h1>
        <p className="text-slate-400">Configure a new deployment project from your GitHub repository.</p>
      </div>

      {deployMutation.isError ? (
        <div className="p-8 text-center bg-slate-900 border border-slate-700 rounded-xl space-y-6">
          <h2 className="text-xl font-bold text-red-400">Deployment Initialization Failed</h2>
          <p className="text-slate-400">
            The project was created, but we couldn't start the initial deployment.
          </p>
          <div className="flex gap-4 justify-center">
            <button 
              onClick={() => {
                const projectId = createMutation.data?.id;
                if (projectId) deployMutation.mutate(projectId);
              }}
              className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium"
            >
              Retry Deployment
            </button>
            <button 
              onClick={() => navigate('/dashboard/projects')}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium"
            >
              Go to Projects
            </button>
          </div>
        </div>
      ) : (
        <ProjectForm 
          initialData={initialData as any}
          onSubmit={async (data) => { await createMutation.mutateAsync(data); }}
          isLoading={createMutation.isPending || deployMutation.isPending}
          isDeploying={(deployMutation.isPending || createMutation.isSuccess) && !deployMutation.isError}
        />
      )}
    </div>
  );
};

export default CreateProject;
