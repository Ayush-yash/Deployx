import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  actionText?: string;
  actionLink?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  icon: Icon, title, description, actionText, actionLink, onAction 
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-2xl border border-dashed border-slate-700/50 bg-slate-800/10"
    >
      <motion.div 
        whileHover={{ scale: 1.1, rotate: 5 }}
        className="w-24 h-24 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-blue-900/20 border border-blue-500/20"
      >
        <Icon className="w-12 h-12 text-blue-400" />
      </motion.div>
      <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>
      <p className="text-slate-400 max-w-md mb-8 text-base">{description}</p>
      
      {actionText && (actionLink ? (
        <Link 
          to={actionLink}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg shadow-lg shadow-blue-500/25 transition-all focus:ring-2 focus:ring-blue-500/50 outline-none flex items-center gap-2"
        >
          {actionText}
        </Link>
      ) : (
        <button 
          onClick={onAction}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg shadow-lg shadow-blue-500/25 transition-all focus:ring-2 focus:ring-blue-500/50 outline-none flex items-center gap-2"
        >
          {actionText}
        </button>
      ))}
    </motion.div>
  );
};
