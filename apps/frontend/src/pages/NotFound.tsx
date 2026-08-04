import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';

export const NotFound: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-4 relative overflow-hidden">
      <Helmet>
        <title>Page Not Found | DeployX</title>
      </Helmet>

      {/* Background decorations */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="relative z-10 flex flex-col items-center text-center p-10 bg-slate-900/60 backdrop-blur-2xl border border-slate-700/50 rounded-3xl max-w-lg w-full shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)]"
      >
        <motion.div 
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          className="w-24 h-24 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-red-900/20 border border-red-500/30 rotate-12"
        >
          <AlertTriangle className="w-12 h-12 text-red-500" />
        </motion.div>
        
        <h1 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-500 mb-2 drop-shadow-sm">404</h1>
        <h2 className="text-2xl font-bold text-white mb-6 tracking-tight">Lost in the Cloud</h2>
        
        <p className="text-slate-400 mb-10 leading-relaxed">
          The deployment or page you are looking for has been moved, deleted, or never existed in the first place.
        </p>
        
        <Link 
          to="/dashboard"
          className="group w-full px-6 py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all text-center flex items-center justify-center gap-2"
        >
          <span>Return to Dashboard</span>
          <motion.span
            className="inline-block"
            whileHover={{ x: 5 }}
          >
            →
          </motion.span>
        </Link>
      </motion.div>
    </div>
  );
};
