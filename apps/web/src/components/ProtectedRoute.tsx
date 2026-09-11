import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-on-surface flex flex-col items-center justify-center gap-space-md">
        <div className="w-10 h-10 border-2 border-primary-container border-t-transparent rounded-full animate-spin"></div>
        <div className="font-code-sm text-xs text-outline font-mono animate-pulse">
          AUTHENTICATING SUPPLYGUARD ENCLAVE...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" state={{ returnTo: location.pathname }} replace />;
  }

  return <>{children}</>;
};
