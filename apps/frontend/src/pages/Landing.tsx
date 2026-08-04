import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Cloud, Zap, Shield, Terminal, Users, Code, ArrowRight } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';

const features = [
  { icon: Zap, title: 'Automated Deployments', desc: 'Push code and let DeployX handle the entire build and release process automatically.' },
  { icon: Cloud, title: 'Real-time Monitoring', desc: 'Keep an eye on your infrastructure with live metrics, logs, and system health status.' },
  { icon: Shield, title: 'Cloud Infrastructure Management', desc: 'Provision and scale resources across AWS, GCP, and Azure from a single interface.' },
  { icon: Terminal, title: 'Deployment Logs', desc: 'Access comprehensive, searchable terminal logs for every deployment and build step.' },
  { icon: Users, title: 'Team Collaboration', desc: 'Invite team members, set granular permissions, and share project access securely.' },
  { icon: Code, title: 'Developer Friendly Workflow', desc: 'Integrate directly with GitHub, GitLab, and Bitbucket for seamless CI/CD.' },
];

const Landing: React.FC = () => {
  return (
    <div className="pt-24 pb-16">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-8">
            Deploy Your Applications <br />
            <span className="text-gradient">Faster</span>
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-400 mb-10">
            Manage deployments, monitor services, and control your cloud infrastructure from one powerful dashboard.
          </p>
          <div className="flex justify-center gap-4">
            <Link to="/dashboard" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-medium transition-all shadow-[0_0_40px_rgba(37,99,235,0.3)] hover:shadow-[0_0_60px_rgba(37,99,235,0.5)] flex items-center gap-2">
              Start Deploying <ArrowRight className="w-5 h-5" />
            </Link>
            <a href="#features" className="glass px-8 py-4 rounded-lg text-lg font-medium text-white hover:bg-white/10 transition-colors">
              View Features
            </a>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-4">Everything you need to ship</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">Powerful tools designed for modern developer teams.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <GlassCard hoverEffect className="h-full flex flex-col">
                  <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-6">
                    <Icon className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                  <p className="text-gray-400 flex-grow">{feature.desc}</p>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-4">Simple, transparent pricing</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">Start for free, scale when you need to.</p>
        </div>

        <div className="max-w-4xl mx-auto">
          <GlassCard variant="panel" className="text-center py-20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-emerald-600/10" />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative z-10"
            >
              <span className="inline-block px-4 py-1 rounded-full bg-blue-500/20 text-blue-300 font-semibold text-sm mb-6 border border-blue-500/30">
                Coming Soon
              </span>
              <h3 className="text-4xl font-bold text-white mb-4">Premium Plans</h3>
              <p className="text-gray-400 mb-8 max-w-lg mx-auto">We are finalizing our premium offerings. Join the waitlist to get early access and exclusive founding member pricing.</p>
              <button className="bg-white text-slate-900 px-8 py-3 rounded-lg font-bold hover:bg-gray-200 transition-colors">
                Join Waitlist
              </button>
            </motion.div>
          </GlassCard>
        </div>
      </section>
    </div>
  );
};

export default Landing;
