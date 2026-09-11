import { Router } from 'express';
import type { ScanResult } from '../types/index.js';
import { processScan } from '../services/scanPipeline.js';
import { generateCycloneDxSbom } from '../services/sbom.js';
import { loadScanFromSupabase, loadScanHistoryFromSupabase } from '../services/supabasePersistence.js';

const router = Router();

// In-memory scan store (with Supabase persistence fallback)
const scanStore = new Map<string, ScanResult>();

// POST /api/scans — Start a new scan
router.post('/', async (req, res) => {
  const { repoUrl, branch, subpath, userId } = req.body;

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
    userId: typeof userId === 'string' ? userId : undefined,
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

  // Kick off async processing in background
  processScan(scan, scanStore).catch((err) => {
    console.error(`[Scan ${scanId}] Fatal scan failure:`, err);
    const s = scanStore.get(scanId);
    if (s) {
      s.status = 'failed';
      s.statusMessage = err instanceof Error ? err.message : 'Unknown scan execution failure';
    }
  });

  res.status(201).json({ scanId });
});

// GET /api/scans/:id — Get scan status and full results
router.get('/:id', async (req, res) => {
  let scan = scanStore.get(req.params.id);

  // If not in local memory, check Supabase
  if (!scan) {
    scan = (await loadScanFromSupabase(req.params.id)) || undefined;
    if (scan) {
      scanStore.set(req.params.id, scan);
    }
  }

  if (!scan) {
    res.status(404).json({ error: 'Scan not found' });
    return;
  }
  res.json(scan);
});

// GET /api/scans/:id/sbom — Export genuine CycloneDX v1.5 JSON SBOM
router.get('/:id/sbom', async (req, res) => {
  let scan = scanStore.get(req.params.id);

  if (!scan) {
    scan = (await loadScanFromSupabase(req.params.id)) || undefined;
  }

  if (!scan) {
    res.status(404).json({ error: 'Scan not found' });
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

// GET /api/scans — List scan history (with user filtering and Supabase fallback)
router.get('/', async (req, res) => {
  const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;

  let scans = Array.from(scanStore.values());
  if (userId) {
    scans = scans.filter((s) => s.userId === userId || !s.userId);
  }

  // Supplement from Supabase if local store is small
  if (scans.length < 5) {
    const dbScans = await loadScanHistoryFromSupabase(userId);
    const seen = new Set(scans.map((s) => s.scanId));
    for (const s of dbScans) {
      if (!seen.has(s.scanId)) {
        scans.push(s);
        seen.add(s.scanId);
      }
    }
  }

  scans.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(scans);
});

export { router as scansRouter };
