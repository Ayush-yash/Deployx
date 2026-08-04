import { z } from 'zod';

export const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  githubUrl: z.string().url('Must be a valid URL').regex(/github\.com/, 'Must be a GitHub repository'),
  branch: z.string().min(1, 'Branch is required').default('main'),
  framework: z.string().min(1, 'Framework is required'),
  port: z.number().int().positive().optional().nullable(),
  description: z.string().optional().nullable(),
  environmentVariables: z.record(z.string(), z.string()).optional().nullable(),
});

export type ProjectInput = z.infer<typeof projectSchema>;
