import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Sparkles } from 'lucide-react';

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 mb-4 animate-pulse">
          <Sparkles className="w-6 h-6 animate-spin duration-1000" />
        </div>
        <p className="text-xs text-dark-muted font-mono tracking-wider uppercase">
          Verifying Candidate Session...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/resume" replace />;
  }

  return children;
};

export default ProtectedRoute;
