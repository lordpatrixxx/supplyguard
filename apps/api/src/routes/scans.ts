import { Router } from 'express';
import type { ScanResult } from '../types/index.js';
import { processScan } from '../services/scanPipeline.js';
import { generateCycloneDxSbom } from '../services/sbom.js';
import { loadScanFromSupabase, loadScanHistoryFromSupabase } from '../services/supabasePersistence.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// In-memory scan store (with Supabase persistence fallback)
export const scanStore = new Map<string, ScanResult>();

// Enforce server-side authentication across all scan endpoints
router.use(requireAuth);

// POST /api/scans — Start a new scan
router.post('/', async (req, res) => {
  const { repoUrl, branch, subpath } = req.body;
  const authenticatedUserId = req.user?.id;

  if (!authenticatedUserId) {
    res.status(401).json({ error: 'Unauthorized: Missing authenticated user identity' });
    return;
  }

  if (!repoUrl || typeof repoUrl !== 'string') {
    res.status(400).json({ error: 'repoUrl is required and must be a valid string' });
    return;
  }

  let normalizedUrl = repoUrl.trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  // Validate GitHub URL format
  const githubUrlPattern = /^https?:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/i;
  if (!githubUrlPattern.test(normalizedUrl)) {
    res.status(400).json({ error: 'Invalid GitHub repository URL. Must be in the format: https://github.com/owner/repository' });
    return;
  }

  const scanId = crypto.randomUUID();
  const scan: ScanResult = {
    scanId,
    userId: authenticatedUserId, // Strictly derived server-side from validated JWT
    repoUrl: normalizedUrl,
    branch: branch && typeof branch === 'string' && branch.trim().length > 0 ? branch.trim() : undefined,
    subpath: subpath && typeof subpath === 'string' && subpath.trim().length > 0 ? subpath.trim() : undefined,
    status: 'queued',
    statusMessage: 'Scan queued for processing...',
    overallRiskScore: 0,
    packages: [],
    edges: [],
    createdAt: new Date().toISOString(),
  };

  scanStore.set(scanId, scan);

  // In serverless environments (Vercel), await scan completion so background execution is not frozen
  if (process.env.VERCEL) {
    try {
      await processScan(scan, scanStore);
    } catch (err) {
      console.error(`[Scan ${scanId}] Fatal scan failure:`, err);
      scan.status = 'failed';
      scan.statusMessage = err instanceof Error ? err.message : 'Unknown scan execution failure';
    }
  } else {
    // In long-running dev/prod node servers, execute asynchronously in background
    processScan(scan, scanStore).catch((err) => {
      console.error(`[Scan ${scanId}] Fatal scan failure:`, err);
      const s = scanStore.get(scanId);
      if (s) {
        s.status = 'failed';
        s.statusMessage = err instanceof Error ? err.message : 'Unknown scan execution failure';
      }
    });
  }

  res.status(201).json({ scanId });
});

// GET /api/scans/:id — Get scan status and full results with tenant isolation
router.get('/:id', async (req, res) => {
  const currentUserId = req.user?.id;
  if (!currentUserId) {
    res.status(401).json({ error: 'Unauthorized: Missing authenticated user identity' });
    return;
  }

  let scan = scanStore.get(req.params.id);

  // If not in local memory, check Supabase strictly for this user
  if (!scan) {
    scan = (await loadScanFromSupabase(req.params.id, currentUserId)) || undefined;
    if (scan) {
      scanStore.set(req.params.id, scan);
    }
  }

  if (!scan) {
    res.status(404).json({ error: 'Scan not found' });
    return;
  }

  // Tenant isolation: enforce that the caller owns this scan
  if (!scan.userId || scan.userId !== currentUserId) {
    res.status(403).json({ error: 'Access denied: You do not have permission to view this scan' });
    return;
  }

  res.json(scan);
});

// GET /api/scans/:id/sbom — Export genuine CycloneDX v1.5 JSON SBOM with tenant isolation
router.get('/:id/sbom', async (req, res) => {
  const currentUserId = req.user?.id;
  if (!currentUserId) {
    res.status(401).json({ error: 'Unauthorized: Missing authenticated user identity' });
    return;
  }

  let scan = scanStore.get(req.params.id);

  if (!scan) {
    scan = (await loadScanFromSupabase(req.params.id, currentUserId)) || undefined;
  }

  if (!scan) {
    res.status(404).json({ error: 'Scan not found' });
    return;
  }

  // Tenant isolation: enforce that the caller owns this scan
  if (!scan.userId || scan.userId !== currentUserId) {
    res.status(403).json({ error: 'Access denied: You do not have permission to export this scan SBOM' });
    return;
  }

  if (scan.status !== 'complete') {
    res.status(400).json({ error: 'Cannot generate SBOM for incomplete or failed scan' });
    return;
  }

  const sbom = generateCycloneDxSbom(scan);
  const repoName = scan.repo || 'repository';
  const filename = `supplyguard-sbom-${repoName}-${scan.scanId.slice(0, 8)}.cdx.json`;

  res.setHeader('Content-Type', 'application/vnd.cyclonedx+json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.json(sbom);
});

// GET /api/scans — List scan history strictly isolated to the authenticated user
router.get('/', async (req, res) => {
  const authenticatedUserId = req.user?.id;

  if (!authenticatedUserId) {
    res.status(401).json({ error: 'Unauthorized: Missing authenticated user identity' });
    return;
  }

  let scans = Array.from(scanStore.values()).filter((s) => s.userId === authenticatedUserId);

  // Supplement from Supabase if local memory has few entries
  if (scans.length < 10) {
    const dbScans = await loadScanHistoryFromSupabase(authenticatedUserId);
    const seen = new Set(scans.map((s) => s.scanId));
    for (const s of dbScans) {
      if (s.userId === authenticatedUserId && !seen.has(s.scanId)) {
        scans.push(s);
        seen.add(s.scanId);
      }
    }
  }

  scans.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(scans);
});

export { router as scansRouter };
