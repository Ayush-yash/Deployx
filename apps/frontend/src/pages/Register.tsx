import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../contexts/AuthContext';
import { GlassCard } from '../components/GlassCard';
import { Loader2, Mail, Lock, User as UserIcon, ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeIn, slideUp, staggerContainer, staggerItem, buttonHover } from '../utils/animations';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema)
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setError('');
      const res = await api.post('/auth/register', data);
      if (res.data.success) {
        navigate('/login');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to register');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Gradients */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
        className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" 
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: 'easeOut', delay: 0.2 }}
        className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/20 blur-[120px] pointer-events-none" 
      />

      <motion.div 
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="w-full max-w-md z-10"
      >
        <motion.div variants={slideUp} className="text-center mb-8">
          <Link to="/" className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
            DeployX
          </Link>
          <p className="text-slate-400 mt-3 font-medium">Create your account</p>
        </motion.div>

        <motion.div variants={slideUp}>
          <GlassCard className="p-8 border-white/10 shadow-2xl backdrop-blur-xl bg-slate-900/60 relative overflow-hidden">
            {/* Subtle top highlight */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <motion.div variants={staggerItem}>
                <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Name</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-400">
                    <UserIcon className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  </div>
                  <input
                    type="text"
                    {...register('name')}
                    className={clsx(
                      "block w-full pl-11 pr-4 py-2.5 border rounded-xl bg-slate-950/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all",
                      errors.name ? "border-red-500/50 focus:border-red-500" : "border-slate-700/50 hover:border-slate-600 focus:border-blue-500"
                    )}
                    placeholder="John Doe"
                  />
                </div>
                <AnimatePresence>
                  {errors.name && (
                    <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mt-1.5 text-sm text-red-400 ml-1">{errors.name.message}</motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.div variants={staggerItem}>
                <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Email Address</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-400">
                    <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  </div>
                  <input
                    type="email"
                    {...register('email')}
                    className={clsx(
                      "block w-full pl-11 pr-4 py-2.5 border rounded-xl bg-slate-950/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all",
                      errors.email ? "border-red-500/50 focus:border-red-500" : "border-slate-700/50 hover:border-slate-600 focus:border-blue-500"
                    )}
                    placeholder="you@example.com"
                  />
                </div>
                <AnimatePresence>
                  {errors.email && (
                    <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mt-1.5 text-sm text-red-400 ml-1">{errors.email.message}</motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.div variants={staggerItem}>
                <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-400">
                    <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  </div>
                  <input
                    type="password"
                    {...register('password')}
                    className={clsx(
                      "block w-full pl-11 pr-4 py-2.5 border rounded-xl bg-slate-950/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all",
                      errors.password ? "border-red-500/50 focus:border-red-500" : "border-slate-700/50 hover:border-slate-600 focus:border-blue-500"
                    )}
                    placeholder="••••••••"
                  />
                </div>
                <AnimatePresence>
                  {errors.password && (
                    <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mt-1.5 text-sm text-red-400 ml-1">{errors.password.message}</motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.div variants={staggerItem} className="pt-2">
                <motion.button
                  variants={buttonHover}
                  whileHover="whileHover"
                  whileTap="whileTap"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-blue-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                  <span className="relative flex items-center gap-2">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        Create Account
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </span>
                </motion.button>
              </motion.div>
            </form>

            <motion.div variants={staggerItem} className="mt-8 text-center border-t border-slate-800/50 pt-6">
              <p className="text-sm text-slate-400">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                  Sign in
                </Link>
              </p>
            </motion.div>
          </GlassCard>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Register;
