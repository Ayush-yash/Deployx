import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GlassCard } from './GlassCard';
import { Loader2, Search, GitBranch, Cpu, Code2, Play, Hammer, Box, FileCode, KeyRound, Eye, EyeOff, Trash2, CheckCircle2, Settings, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { projectService } from '../services/projectService';

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  githubUrl: z.string().url('Must be a valid URL').regex(/github\.com/, 'Must be a GitHub repository'),
  branch: z.string().min(1, 'Branch is required').default('main'),
  framework: z.string().min(1, 'Framework is required'),
  port: z.preprocess((val) => {
    if (val === '' || val === null || Number.isNaN(val)) return undefined;
    return Number(val);
  }, z.number().int().positive().optional()),
  description: z.string().optional().nullable(),
  language: z.string().optional().nullable(),
  runtime: z.string().optional().nullable(),
  packageManager: z.string().optional().nullable(),
  buildCommand: z.string().optional().nullable(),
  startCommand: z.string().optional().nullable(),
  outputDirectory: z.string().optional().nullable(),
  hasDockerfile: z.boolean().optional(),
  hasDockerCompose: z.boolean().optional(),
  dockerfileContent: z.string().optional().nullable(),
  environmentVariables: z.record(z.string()).optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface ProjectFormProps {
  initialData?: Partial<ProjectFormData>;
  onSubmit: (data: ProjectFormData) => Promise<void>;
  isLoading: boolean;
  isEdit?: boolean;
  isDeploying?: boolean;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({ initialData, onSubmit, isLoading, isEdit, isDeploying }) => {
  const [phase, setPhase] = useState<number>(isEdit ? 2 : 1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [showEnv, setShowEnv] = useState<Record<string, boolean>>({});
  const [newEnvKey, setNewEnvKey] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [readinessScore, setReadinessScore] = useState(0);

  const { register, handleSubmit, reset, watch, setValue, getValues, formState: { errors } } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: initialData || { branch: 'main' }
  });

  const githubUrl = watch('githubUrl');
  const branch = watch('branch');

  useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  const handleAddEnv = () => {
    if (newEnvKey.trim()) {
      const current = getValues('environmentVariables') || {};
      setValue('environmentVariables', { ...current, [newEnvKey.trim()]: '' });
      setNewEnvKey('');
    }
  };

  const handleAnalyze = async () => {
    if (!githubUrl || !branch) {
      setAnalysisError('GitHub URL and Branch are required for analysis.');
      return;
    }
    setAnalysisError(null);
    setIsAnalyzing(true);
    
    try {
      const result = await projectService.analyzeRepository({ githubUrl, branch });
      
      setValue('framework', result.framework);
      setValue('language', result.language);
      setValue('runtime', result.runtime);
      setValue('packageManager', result.packageManager);
      setValue('buildCommand', result.buildCommand);
      setValue('startCommand', result.startCommand);
      setValue('outputDirectory', result.outputDirectory);
      setValue('hasDockerfile', result.hasDockerfile);
      setValue('hasDockerCompose', result.hasDockerCompose);
      setValue('dockerfileContent', result.dockerfileContent);
      setReadinessScore(result.readinessScore || 0);
      
      if (result.environmentVariables && Object.keys(result.environmentVariables).length > 0) {
        setValue('environmentVariables', result.environmentVariables);
      }
      
      if (result.port) setValue('port', result.port);

      if (!watch('name')) {
        const repoName = githubUrl.split('/').pop()?.replace('.git', '');
        if (repoName) setValue('name', repoName);
      }
      
      setPhase(2);
    } catch (err: any) {
      const serverMsg = err.response?.data?.message || err.message || '';
      const isGitHubNotConnected = serverMsg.toLowerCase().includes('github account not connected') || serverMsg.toLowerCase().includes('not connected');
      setAnalysisError(
        isGitHubNotConnected
          ? 'GitHub account not connected. Please connect your GitHub account in the GitHub Integration page first.'
          : serverMsg || 'Failed to analyze repository. Check the URL and branch name.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
    if (score >= 50) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    return 'text-red-400 bg-red-400/10 border-red-400/20';
  };

  if (isDeploying) {
    return (
      <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
        <GlassCard className="p-12 flex flex-col items-center justify-center text-center space-y-6">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full"></div>
            <Loader2 className="w-16 h-16 text-blue-400 animate-spin relative z-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-white">Initializing Deployment</h3>
            <p className="text-slate-400 text-lg">Redirecting to your live deployment terminal...</p>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
      {phase === 1 && (
        <GlassCard className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
          <div className="text-center space-y-2 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
              <Search className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-white">Let's build something</h3>
            <p className="text-slate-400">Import your GitHub repository and we'll handle the rest.</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">GitHub Repository URL</label>
              <div className="relative">
                <GitBranch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  {...register('githubUrl')}
                  className={clsx(
                    "block w-full pl-12 pr-4 py-3 border rounded-xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all shadow-inner",
                    errors.githubUrl ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/20" : "border-slate-700 focus:border-blue-500 focus:ring-blue-500/20"
                  )}
                  placeholder="https://github.com/user/repo"
                />
              </div>
              {errors.githubUrl && <p className="mt-2 text-sm text-red-400">{errors.githubUrl.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Branch</label>
              <input
                {...register('branch')}
                className={clsx(
                  "block w-full px-4 py-3 border rounded-xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all shadow-inner",
                  errors.branch ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/20" : "border-slate-700 focus:border-blue-500 focus:ring-blue-500/20"
                )}
                placeholder="main"
              />
              {errors.branch && <p className="mt-2 text-sm text-red-400">{errors.branch.message}</p>}
            </div>
          </div>

          {analysisError && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 items-start">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm leading-relaxed">{analysisError}</p>
            </div>
          )}

          <div className="pt-4">
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isAnalyzing || !githubUrl}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing Repository...</>
              ) : (
                <>Analyze & Configure <CheckCircle2 className="w-5 h-5" /></>
              )}
            </button>
          </div>
        </GlassCard>
      )}

      {phase === 2 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <GlassCard className="p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/50 pb-6 mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">AI Repository Analysis</h3>
                <p className="text-slate-400">DeployX has automatically configured your project settings.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/50 flex items-center gap-4">
                 <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <Code2 className="w-5 h-5" />
                 </div>
                 <div>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Language</p>
                    <p className="text-sm font-bold text-white">{watch('language') || 'Unknown'}</p>
                 </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/50 flex items-center gap-4">
                 <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <Box className="w-5 h-5" />
                 </div>
                 <div>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Framework</p>
                    <p className="text-sm font-bold text-white">{watch('framework') || 'Unknown'}</p>
                 </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/50 flex items-center gap-4">
                 <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                    <Hammer className="w-5 h-5" />
                 </div>
                 <div>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Builder</p>
                    <p className="text-sm font-bold text-white">{watch('packageManager') || 'Auto'}</p>
                 </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/50 flex items-center gap-4">
                 <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-400">
                    <FileCode className="w-5 h-5" />
                 </div>
                 <div>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Dockerfile</p>
                    <p className="text-sm font-bold text-white">{watch('hasDockerfile') ? 'Existing' : 'Auto-Generated'}</p>
                 </div>
              </div>
            </div>

            <div className="space-y-4 mb-8">
               <label className="block text-sm font-medium text-slate-300">Project Name</label>
               <input
                 {...register('name')}
                 className="block w-full max-w-md px-4 py-3 border border-slate-700 rounded-xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
               />
               {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>}
            </div>

            {/* Environment Variables */}
            <div className="mb-8 border border-slate-700/50 rounded-xl overflow-hidden bg-slate-900/30">
               <div className="p-4 bg-slate-800/30 border-b border-slate-700/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <KeyRound className="w-5 h-5 text-yellow-400" />
                     <h4 className="font-semibold text-white">Environment Variables</h4>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 bg-slate-800 rounded-md text-slate-300 border border-slate-700">
                     {Object.keys(watch('environmentVariables') || {}).length} Detected
                  </span>
               </div>
               <div className="p-4 space-y-4">
                 {Object.keys(watch('environmentVariables') || {}).length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">No environment variables detected.</p>
                 ) : (
                   Object.keys(watch('environmentVariables') || {}).map((key) => (
                     <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-4">
                       <div className="sm:w-1/3">
                         <p className="text-sm font-mono font-medium text-slate-300 break-all">{key}</p>
                       </div>
                       <div className="flex-1 flex gap-2">
                         <div className="relative flex-1">
                           <input
                             type={showEnv[key] ? 'text' : 'password'}
                             {...register(`environmentVariables.${key}` as any)}
                             className="block w-full pl-3 pr-10 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white font-mono text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-colors"
                             placeholder="Leave blank to ignore"
                           />
                           <button
                             type="button"
                             onClick={() => setShowEnv(prev => ({ ...prev, [key]: !prev[key] }))}
                             className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                           >
                             {showEnv[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                           </button>
                         </div>
                         <button
                           type="button"
                           onClick={() => {
                             const current = getValues('environmentVariables') || {};
                             const newVars = { ...current };
                             delete newVars[key];
                             setValue('environmentVariables', newVars);
                           }}
                           className="p-2 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors shrink-0"
                           title="Remove Variable"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                       </div>
                     </div>
                   ))
                 )}
                 <div className="pt-2 flex flex-col sm:flex-row gap-3">
                   <input
                     type="text"
                     value={newEnvKey}
                     onChange={(e) => setNewEnvKey(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddEnv())}
                     placeholder="New variable name (e.g. API_KEY)"
                     className="flex-1 px-4 py-2 border border-slate-700 rounded-lg bg-slate-900/50 text-white font-mono text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                   />
                   <button
                     type="button"
                     onClick={handleAddEnv}
                     disabled={!newEnvKey.trim()}
                     className="px-6 py-2 text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                   >
                     Add Variable
                   </button>
                 </div>
               </div>
            </div>

            {/* Advanced Settings */}
            <div className="border border-slate-700/50 rounded-xl overflow-hidden bg-slate-900/30 mb-8">
               <button
                 type="button"
                 onClick={() => setShowAdvanced(!showAdvanced)}
                 className="w-full p-4 bg-slate-800/30 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
               >
                 <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-slate-400" />
                    <h4 className="font-semibold text-white">Advanced Settings</h4>
                 </div>
                 {showAdvanced ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
               </button>
               
               {showAdvanced && (
                 <div className="p-6 space-y-6 border-t border-slate-700/50 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Build Command</label>
                          <input
                            {...register('buildCommand')}
                            className="block w-full px-4 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            placeholder="npm run build"
                          />
                       </div>
                       <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Start Command</label>
                          <input
                            {...register('startCommand')}
                            className="block w-full px-4 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            placeholder="npm start"
                          />
                       </div>
                       <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Output Directory</label>
                          <input
                            {...register('outputDirectory')}
                            className="block w-full px-4 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            placeholder="dist or build"
                          />
                       </div>
                       <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Container Port</label>
                          <input
                            type="number"
                            {...register('port', { valueAsNumber: true })}
                            className="block w-full px-4 py-2 border border-slate-700 rounded-lg bg-slate-950 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            placeholder="e.g. 3000"
                          />
                       </div>
                       <div className="md:col-span-2">
                          <div className="flex items-center justify-between mb-2">
                             <label className="block text-sm font-medium text-slate-300">Dockerfile Content</label>
                             <div className="flex items-center gap-2">
                               <input type="checkbox" {...register('hasDockerfile')} className="rounded border-slate-700 bg-slate-900" />
                               <span className="text-xs text-slate-400">Use Custom Dockerfile</span>
                             </div>
                          </div>
                          <textarea
                            {...register('dockerfileContent')}
                            spellCheck="false"
                            className="w-full h-48 p-4 rounded-lg bg-[#0d1117] border border-slate-700 text-slate-300 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-y"
                            placeholder="FROM node:20-alpine..."
                          />
                       </div>
                       
                       <div className="md:col-span-2 border-t border-slate-700/50 pt-4 mt-2">
                          <div className="flex items-center justify-between mb-2">
                             <label className="block text-sm font-medium text-slate-300 flex items-center gap-2">
                               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-blue-400"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                               Kubernetes Manifest (YAML)
                             </label>
                             <div className="flex items-center gap-2">
                               <input type="checkbox" {...register('hasKubernetesManifest')} className="rounded border-slate-700 bg-slate-900" />
                               <span className="text-xs text-slate-400">Use Custom Manifest</span>
                             </div>
                          </div>
                          <p className="text-xs text-slate-500 mb-3">Use <code className="text-blue-400 bg-blue-400/10 px-1 py-0.5 rounded">{"{{IMAGE_NAME}}"}</code> and <code className="text-blue-400 bg-blue-400/10 px-1 py-0.5 rounded">{"{{PORT}}"}</code> in your manifest to dynamically inject the built image and port.</p>
                          <textarea
                            {...register('kubernetesManifestContent')}
                            spellCheck="false"
                            className="w-full h-64 p-4 rounded-lg bg-[#0d1117] border border-slate-700 text-slate-300 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-y"
                            placeholder={"apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: my-app\nspec:\n  template:\n    spec:\n      containers:\n        - name: app\n          image: {{IMAGE_NAME}}\n          ports:\n            - containerPort: {{PORT}}"}
                          />
                       </div>
                    </div>
                 </div>
               )}
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-slate-700/50">
               {!isEdit ? (
                 <button 
                   type="button"
                   onClick={() => setPhase(1)}
                   className="px-6 py-3 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                 >
                   ← Back
                 </button>
               ) : (
                 <div />
               )}
               <button 
                 type="submit"
                 disabled={isLoading}
                 className="flex items-center gap-2 px-8 py-3 text-base font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 rounded-xl transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                 {isEdit ? 'Save Changes' : 'Deploy Now'}
               </button>
            </div>
          </GlassCard>
        </div>
      )}
    </form>
  );
};
