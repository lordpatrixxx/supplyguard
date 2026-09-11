import type { ScanResult, PackageNode } from '../types/index.js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ykzjbxtjzxmpuwpuyvzr.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrempieHRqenhtcHV3cHV5dnpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MjA1NDQsImV4cCI6MjEwNDA5NjU0NH0.j7v8hmWSN8fcqSQa2pAh7_l8YQ8PUJn-kshuZfUwJQw';

/**
 * Lightweight progress update: only patches status and status_message in public.scans.
 * Does NOT send the heavy raw_result, avoiding database locks and thread timeouts.
 * Will NOT overwrite if scan is already 'complete'.
 */
export async function persistScanProgress(
  scanId: string,
  userId: string | undefined,
  status: string,
  statusMessage?: string
): Promise<void> {
  try {
    if (!userId) return;

    // Direct PATCH to public.scans where scan_id = scanId AND status != 'complete'
    const url = `${SUPABASE_URL}/rest/v1/scans?scan_id=eq.${encodeURIComponent(scanId)}&status=neq.complete`;
    await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        status,
        status_message: statusMessage || null,
      }),
    });
  } catch {
    // Non-fatal progress update
  }
}

/**
 * Persists full scan metadata and raw result to Supabase public.scans
 * on completion or failure.
 */
export async function persistScanToSupabase(scan: ScanResult): Promise<void> {
  try {
    if (!scan.userId) {
      console.warn('[SupabasePersistence] Skipping scan persistence: missing user_id');
      return;
    }

    const criticalCount = scan.packages.filter((p) => p.riskTier === 'critical').length;
    const highCount = scan.packages.filter((p) => p.riskScore >= 60 && p.riskScore < 70).length;
    const mediumCount = scan.packages.filter((p) => p.riskTier === 'medium' && p.riskScore < 60).length;
    const lowCount = scan.packages.filter((p) => p.riskScore > 0 && p.riskScore < 40).length;
    const safeCount = scan.packages.filter((p) => p.riskScore === 0).length;

    const payload = {
      scan_id: scan.scanId,
      user_id: scan.userId,
      repository_url: scan.repoUrl,
      owner: scan.owner || null,
      repository: scan.repo || null,
      branch: scan.branch || 'HEAD',
      subpath: scan.subpath || null,
      status: scan.status,
      status_message: scan.statusMessage || null,
      dependency_count: scan.packages.length,
      overall_risk_score: scan.overallRiskScore,
      critical_count: criticalCount,
      high_count: highCount,
      medium_count: mediumCount,
      low_count: lowCount,
      safe_count: safeCount,
      raw_result: scan,
      completed_at: scan.completedAt || null,
    };

    // Invoke save_scan_record RPC in Supabase
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/save_scan_record`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ payload }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn('[SupabasePersistence] save_scan_record RPC response:', res.status, errText);
    }
  } catch (err) {
    console.warn('[SupabasePersistence] Error persisting scan:', err);
  }
}

/**
 * Loads a scan from Supabase by scanId and userId enforcing tenant isolation.
 */
export async function loadScanFromSupabase(scanId: string, userId?: string): Promise<ScanResult | null> {
  try {
    if (!userId) {
      return null;
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_scan_by_id`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        p_scan_id: scanId,
        p_user_id: userId,
      }),
    });

    if (res.ok) {
      const scanData = (await res.json()) as ScanResult | null;
      if (scanData && scanData.scanId) {
        return scanData;
      }
    }
  } catch (err) {
    console.warn('[SupabasePersistence] Error loading scan:', err);
  }
  return null;
}

/**
 * Loads scan history from Supabase strictly for the specified authenticated user.
 */
export async function loadScanHistoryFromSupabase(userId?: string): Promise<ScanResult[]> {
  try {
    if (!userId) {
      return [];
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_user_scans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        p_user_id: userId,
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as ScanResult[];
      if (Array.isArray(data)) {
        return data.filter((s) => Boolean(s && s.scanId && s.userId === userId));
      }
    }
  } catch (err) {
    console.warn('[SupabasePersistence] Error loading history:', err);
  }
  return [];
}
