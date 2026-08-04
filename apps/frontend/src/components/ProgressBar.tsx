import React from 'react';
import { motion } from 'framer-motion';

interface ProgressBarProps {
  percentage: number;
  label?: string;
  status?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ percentage, label, status }) => {
  const isError = status === 'Failed';
  const isComplete = status === 'Running' || percentage >= 100;
  
  const barColor = isError ? 'bg-red-500' : isComplete ? 'bg-emerald-500' : 'bg-blue-500';
  
  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-2">
        <span className="text-sm font-medium text-slate-300">{label || 'Progress'}</span>
        <span className="text-xs font-mono text-slate-400">{percentage}%</span>
      </div>
      <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/50 shadow-inner">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`h-full ${barColor} shadow-[0_0_10px_rgba(59,130,246,0.5)]`}
        />
      </div>
    </div>
  );
};
