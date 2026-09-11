import type { ScanResult, PackageNode } from '../types/index.js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ykzjbxtjzxmpuwpuyvzr.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrempieHRqenhtcHV3cHV5dnpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MjA1NDQsImV4cCI6MjEwNDA5NjU0NH0.j7v8hmWSN8fcqSQa2pAh7_l8YQ8PUJn-kshuZfUwJQw';

/**
 * Asynchronously persists scan metadata and raw result to Supabase public.scans
 * and itemized findings to public.findings.
 */
export async function persistScanToSupabase(scan: ScanResult): Promise<void> {
  try {
    const criticalCount = scan.packages.filter((p) => p.riskTier === 'critical').length;
    const highCount = scan.packages.filter((p) => p.riskScore >= 60 && p.riskScore < 70).length;
    const mediumCount = scan.packages.filter((p) => p.riskTier === 'medium' && p.riskScore < 60).length;
    const lowCount = scan.packages.filter((p) => p.riskScore > 0 && p.riskScore < 40).length;
    const safeCount = scan.packages.filter((p) => p.riskScore === 0).length;

    const payload = {
      scan_id: scan.scanId,
      user_id: scan.userId || null,
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

    // Upsert into scans table via PostgREST
    const res = await fetch(`${SUPABASE_URL}/rest/v1/scans?on_conflict=scan_id`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn('[SupabasePersistence] Upsert scan warning:', res.status, errText);
    }
  } catch (err) {
    // Non-fatal, local memory store ensures resilience
    console.warn('[SupabasePersistence] Error persisting scan:', err);
  }
}

/**
 * Loads a scan from Supabase by scanId if not in memory.
 */
export async function loadScanFromSupabase(scanId: string): Promise<ScanResult | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/scans?scan_id=eq.${encodeURIComponent(scanId)}&select=raw_result`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (res.ok) {
      const data = (await res.json()) as Array<{ raw_result?: ScanResult }>;
      if (data.length > 0 && data[0].raw_result) {
        return data[0].raw_result;
      }
    }
  } catch (err) {
    console.warn('[SupabasePersistence] Error loading scan:', err);
  }
  return null;
}

/**
 * Loads scan history from Supabase for a given user.
 */
export async function loadScanHistoryFromSupabase(userId?: string): Promise<ScanResult[]> {
  try {
    if (!userId) {
      return [];
    }

    const url = `${SUPABASE_URL}/rest/v1/scans?user_id=eq.${encodeURIComponent(userId)}&select=raw_result&order=created_at.desc&limit=50`;

    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (res.ok) {
      const data = (await res.json()) as Array<{ raw_result?: ScanResult }>;
      return data.filter((d) => Boolean(d.raw_result)).map((d) => d.raw_result!);
    }
  } catch (err) {
    console.warn('[SupabasePersistence] Error loading history:', err);
  }
  return [];
}
