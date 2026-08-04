import React from 'react';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export const GlobalLoader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen bg-slate-950 relative overflow-hidden">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <div className="w-[40vw] h-[40vw] bg-blue-500/10 rounded-full blur-[100px] animate-pulse" />
      </motion.div>
      
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ 
          type: "spring",
          stiffness: 260,
          damping: 20 
        }}
        className="relative z-10 flex flex-col items-center"
      >
        <div className="relative p-6 bg-slate-900/60 rounded-2xl border border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-transparent to-purple-500/10 opacity-50" />
          <Loader2 className="w-12 h-12 text-blue-400 animate-spin relative z-10 drop-shadow-md" />
        </div>
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-8 flex flex-col items-center gap-2 z-10"
      >
        <h3 className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          DeployX
        </h3>
        <p className="text-slate-400 text-sm font-medium tracking-widest uppercase">
          Initializing Workspace
        </p>
      </motion.div>
    </div>
  );
};
