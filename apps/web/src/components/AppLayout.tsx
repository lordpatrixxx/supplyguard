import React from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getScanHistory } from '../lib/api';
import type { ScanResult } from '../types';
import { AppHeader } from './nav/AppHeader';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const { user } = useAuth();

  // Fetch recent scans for authenticated user to support contextual scanId
  const { data: scans } = useQuery<ScanResult[]>({
    queryKey: ['scans', user?.id],
    queryFn: async () => {
      try {
        return await getScanHistory();
      } catch (err) {
        console.warn('[AppLayout] Could not load scans:', err);
        return [];
      }
    },
  });

  // Extract scan ID from path if present (e.g. /app/scans/:id/...)
  const scanMatch = location.pathname.match(/\/scans\/([a-zA-Z0-9_-]+)/);
  const currentScanId = scanMatch ? scanMatch[1] : scans && scans.length > 0 ? scans[0].scanId : null;

  return (
    <div className="min-h-screen bg-background text-on-surface antialiased flex flex-col transition-colors duration-200">
      <AppHeader currentScanId={currentScanId} />
      <main className="flex-1 w-full">
        {children}
      </main>
    </div>
  );
}
