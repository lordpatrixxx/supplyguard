import { supabase } from './supabase';
import type { ScanResult } from '../types';

/**
 * Authenticated API Client for SupplyGuard.
 * Automatically derives and forwards the Supabase session JWT to backend endpoints.
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

export async function createScan(params: {
  repoUrl: string;
  branch?: string;
  subpath?: string;
}): Promise<{ scanId: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/scans', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to initiate scan (status ${res.status})`);
  }

  return res.json();
}

export async function getScan(scanId: string): Promise<ScanResult> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/scans/${encodeURIComponent(scanId)}`, {
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch scan results (status ${res.status})`);
  }

  return res.json();
}

export async function getScanHistory(): Promise<ScanResult[]> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/scans', {
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch scan ledger (status ${res.status})`);
  }

  return res.json();
}

export async function downloadSbom(scanId: string, repoName?: string): Promise<void> {
  const headers = await getAuthHeaders();
  delete headers['Content-Type'];

  const res = await fetch(`/api/scans/${encodeURIComponent(scanId)}/sbom`, {
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to export CycloneDX SBOM (status ${res.status})`);
  }

  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = `supplyguard-sbom-${repoName || 'repo'}-${scanId.slice(0, 8)}.cdx.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(downloadUrl);
}
