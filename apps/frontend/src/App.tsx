import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GlobalLoader } from './components/GlobalLoader';
import { PageTransition } from './components/PageTransition';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Eagerly loaded for performance
import Login from './pages/Login';
import Register from './pages/Register';

// Lazy Loaded Pages
const Dashboard = lazy(() => import('./pages/DashboardHome'));
const Projects = lazy(() => import('./pages/Projects'));
const Deployments = lazy(() => import('./pages/Deployments'));
const DeploymentDetails = lazy(() => import('./pages/DeploymentDetails'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Monitoring = lazy(() => import('./pages/Monitoring'));
const GitBranch = lazy(() => import('./pages/GitHubConnect'));
const GitHubCallback = lazy(() => import('./pages/GitHubCallback'));
const CreateProject = lazy(() => import('./pages/CreateProject'));
const ProjectDetails = lazy(() => import('./pages/ProjectDetails'));
const EditProject = lazy(() => import('./pages/EditProject'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Logs = lazy(() => import('./pages/Logs'));
const Settings = lazy(() => import('./pages/Settings'));
const Repositories = lazy(() => import('./pages/github/Repositories'));
const RepositoryDetails = lazy(() => import('./pages/github/RepositoryDetails'));
import { NotFound } from './pages/NotFound';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return <GlobalLoader />;
  if (!isAuthenticated) return <Navigate to="/login" />;
  
  return <>{children}</>;
};

// Extracted to use `useLocation`
const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        
        <Route path="/login" element={<Navigate to="/dashboard" />} />
        <Route path="/register" element={<Navigate to="/dashboard" />} />

        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={
            <Suspense fallback={<GlobalLoader />}><PageTransition><Dashboard /></PageTransition></Suspense>
          } />
          
          <Route path="projects" element={
            <Suspense fallback={<GlobalLoader />}><PageTransition><Projects /></PageTransition></Suspense>
          } />
          
          <Route path="github" element={
            <Suspense fallback={<GlobalLoader />}><PageTransition><GitBranch /></PageTransition></Suspense>
          } />

          <Route path="github/callback" element={
            <Suspense fallback={<GlobalLoader />}><PageTransition><GitHubCallback /></PageTransition></Suspense>
          } />
          
          <Route path="github/repositories" element={
            <Suspense fallback={<GlobalLoader />}><PageTransition><Repositories /></PageTransition></Suspense>
          } />

          <Route path="github/repositories/:owner/:repo" element={
            <Suspense fallback={<GlobalLoader />}><PageTransition><RepositoryDetails /></PageTransition></Suspense>
          } />
          
          <Route path="projects/new" element={
            <Suspense fallback={<GlobalLoader />}><PageTransition><CreateProject /></PageTransition></Suspense>
          } />

          <Route path="projects/:id" element={
            <Suspense fallback={<GlobalLoader />}><PageTransition><ProjectDetails /></PageTransition></Suspense>
          } />

          <Route path="projects/:id/edit" element={
            <Suspense fallback={<GlobalLoader />}><PageTransition><EditProject /></PageTransition></Suspense>
          } />
          
          <Route path="deployments" element={
            <Suspense fallback={<GlobalLoader />}><PageTransition><Deployments /></PageTransition></Suspense>
          } />
          
          <Route path="deployments/:id" element={
            <Suspense fallback={<GlobalLoader />}><PageTransition><DeploymentDetails /></PageTransition></Suspense>
          } />
          
          <Route path="analytics" element={
            <Suspense fallback={<GlobalLoader />}><PageTransition><Analytics /></PageTransition></Suspense>
          } />

          <Route path="monitoring" element={
            <Suspense fallback={<GlobalLoader />}><PageTransition><Monitoring /></PageTransition></Suspense>
          } />
          
          <Route path="notifications" element={
            <Suspense fallback={<GlobalLoader />}><PageTransition><Notifications /></PageTransition></Suspense>
          } />
          
          <Route path="logs" element={
            <Suspense fallback={<GlobalLoader />}><PageTransition><Logs /></PageTransition></Suspense>
          } />
          
          <Route path="profile" element={
            <Suspense fallback={<GlobalLoader />}><PageTransition><Settings /></PageTransition></Suspense>
          } />
          
          <Route path="settings" element={
            <Suspense fallback={<GlobalLoader />}><PageTransition><Settings /></PageTransition></Suspense>
          } />
        </Route>

        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Helmet>
              <title>DeployX | Modern Platform as a Service</title>
              <meta name="description" content="Deploy your applications instantly with DeployX." />
            </Helmet>
            
            <AnimatedRoutes />
            
            <Toaster 
              position="top-right"
              toastOptions={{
                style: {
                  background: 'rgba(15, 23, 42, 0.8)',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(12px)'
                },
                success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
                error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } }
              }}
            />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
