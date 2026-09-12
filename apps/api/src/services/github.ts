/**
 * Fetches and recursively discovers all supported dependency manifests
 * from a public GitHub repository via GitHub Git Trees API and raw file fetch.
 * No git clone — security constraint.
 * Supports recursive search, tree completeness handling, and branch/subpath filtering.
 */

export interface RawManifestFile {
  path: string; // e.g. "frontend/package.json"
  fileName: string; // e.g. "package.json"
  directory: string; // e.g. "frontend" or "root"
  project: string; // e.g. "frontend" or "root"
  ecosystem: 'npm' | 'PyPI';
  rawContent: string;
}

export interface ManifestResult {
  owner: string;
  repo: string;
  branch: string;
  subpath?: string;
  detectedFiles: string[];
  manifests: RawManifestFile[];
  treeCompleteness: 'complete' | 'truncated' | 'fallback';
  // Backwards-compatibility fields for single-manifest flows
  packageJson: Record<string, unknown> | null;
  lockfile: Record<string, unknown> | null;
}

const IGNORED_PATH_SEGMENTS = new Set([
  'node_modules',
  'venv',
  '.venv',
  'env',
  '.env',
  '.git',
  'dist',
  'build',
  '__pycache__',
  '.tox',
  '.nox',
  '.pytest_cache',
  '.mypy_cache',
  '.eggs',
  'vendor',
  '.yarn',
  'site-packages',
]);

/**
 * Checks if a path belongs to an ignored directory (e.g. node_modules or venv)
 */
export function isIgnoredPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  return parts.some((part) => IGNORED_PATH_SEGMENTS.has(part.toLowerCase()));
}

/**
 * Identifies if a file name is a supported dependency manifest and returns its ecosystem
 */
export function classifyManifestFile(fileName: string): { isManifest: boolean; ecosystem?: 'npm' | 'PyPI' } {
  const lower = fileName.toLowerCase();

  // npm manifests
  if (lower === 'package.json' || lower === 'package-lock.json' || lower === 'npm-shrinkwrap.json') {
    return { isManifest: true, ecosystem: 'npm' };
  }

  // Python manifests
  if (
    lower === 'requirements.txt' ||
    lower === 'requirements-dev.txt' ||
    lower.endsWith('-requirements.txt') ||
    lower.endsWith('_requirements.txt') ||
    lower.startsWith('requirements-') ||
    lower.startsWith('requirements_') ||
    lower === 'pyproject.toml' ||
    lower === 'pipfile' ||
    lower === 'pipfile.lock' ||
    lower === 'poetry.lock'
  ) {
    return { isManifest: true, ecosystem: 'PyPI' };
  }

  return { isManifest: false };
}

/**
 * Derives project name and directory from relative file path
 * e.g. "frontend/package.json" -> directory: "frontend", project: "frontend"
 * "package.json" -> directory: "root", project: "root"
 */
export function extractProjectContext(filePath: string): { directory: string; project: string } {
  const normalized = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = normalized.split('/');
  if (parts.length <= 1) {
    return { directory: 'root', project: 'root' };
  }
  const dirParts = parts.slice(0, -1);
  const directory = dirParts.join('/');
  // Friendly project name uses last directory part or path (e.g. "frontend", "backend")
  const project = dirParts[dirParts.length - 1] || 'root';
  return { directory, project };
}

export async function fetchManifests(
  repoUrl: string,
  branch?: string,
  subpath?: string
): Promise<ManifestResult> {
  // Parse owner/repo from URL
  const match = repoUrl.match(/github\.com\/([\w.-]+)\/([\w.-]+)/);
  if (!match) {
    throw new Error(`Invalid GitHub repository URL: ${repoUrl}. Expected format: https://github.com/owner/repository`);
  }

  const [, owner, repo] = match;
  const cleanRepo = repo.replace(/\.git$/, '');
  const ref = branch && branch.trim().length > 0 ? branch.trim() : 'HEAD';

  const cleanSubpath = subpath ? subpath.trim().replace(/^\/+|\/+$/g, '') : '';

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'SupplyGuard/1.0',
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  // Helper to fetch raw content: tries raw.githubusercontent.com first (bypasses 60 req/hr REST API rate limit)
  async function fetchRawFileContent(filePath: string): Promise<string | null> {
    // 1. Try raw.githubusercontent.com
    try {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${cleanRepo}/${encodeURIComponent(ref)}/${filePath}`;
      const rawHeaders: Record<string, string> = {
        'User-Agent': 'SupplyGuard/1.0',
      };
      if (process.env.GITHUB_TOKEN) {
        rawHeaders.Authorization = `token ${process.env.GITHUB_TOKEN}`;
      }

      const rawRes = await fetch(rawUrl, { headers: rawHeaders });
      if (rawRes.ok) {
        return await rawRes.text();
      }
    } catch {
      // Fallback to Contents API
    }

    // 2. Try GitHub Contents API (raw media type)
    try {
      const apiUrl = `https://api.github.com/repos/${owner}/${cleanRepo}/contents/${encodeURI(filePath)}?ref=${encodeURIComponent(ref)}`;
      const apiHeaders = { ...headers, Accept: 'application/vnd.github.v3.raw' };
      const res = await fetch(apiUrl, { headers: apiHeaders });

      if (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0') {
        throw new Error(
          'GitHub API rate limit exceeded (60 req/hr unauthenticated limit). Please configure GITHUB_TOKEN in environment variables to raise limit to 5,000 req/hr.'
        );
      }

      if (res.ok) {
        return await res.text();
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('rate limit')) throw err;
    }

    return null;
  }

  // Step 1: Query Git Trees API recursively
  let treeCompleteness: 'complete' | 'truncated' | 'fallback' = 'complete';
  let treeFiles: Array<{ path: string; type: string }> = [];

  const treeUrl = `https://api.github.com/repos/${owner}/${cleanRepo}/git/trees/${encodeURIComponent(ref)}?recursive=1`;

  try {
    const treeRes = await fetch(treeUrl, { headers });

    if (treeRes.status === 403) {
      if (treeRes.headers.get('x-ratelimit-remaining') === '0') {
        throw new Error(
          'GitHub API rate limit exceeded (60 req/hr unauthenticated limit). Please configure GITHUB_TOKEN in environment variables to raise limit to 5,000 req/hr.'
        );
      }
      throw new Error(
        `Access forbidden to repository "${owner}/${cleanRepo}" (HTTP 403). Ensure repository is public or supply a valid GITHUB_TOKEN.`
      );
    }

    if (treeRes.status === 404 || treeRes.status === 401) {
      throw new Error(
        `Repository "${owner}/${cleanRepo}" not found or is private (HTTP ${treeRes.status}). Ensure repository exists and is public.`
      );
    }

    if (treeRes.status === 409 || treeRes.status === 422) {
      throw new Error(`Git repository "${owner}/${cleanRepo}" is empty or has no commits.`);
    }

    if (!treeRes.ok) {
      throw new Error(`Failed to fetch repository tree from GitHub (HTTP ${treeRes.status} ${treeRes.statusText})`);
    }

    const treeData = (await treeRes.json()) as {
      tree?: Array<{ path: string; type: string }>;
      truncated?: boolean;
    };

    if (treeData.truncated) {
      treeCompleteness = 'truncated';
    }

    treeFiles = treeData.tree || [];
  } catch (err) {
    if (err instanceof Error && (err.message.includes('rate limit') || err.message.includes('not found') || err.message.includes('empty'))) {
      throw err;
    }
    // If tree API fails (e.g. huge repo), fallback to standard conventions
    treeCompleteness = 'fallback';
  }

  // Step 2: If fallback or truncated, probe common subdirectories if tree had few/no entries
  if (treeCompleteness === 'fallback' || (treeCompleteness === 'truncated' && treeFiles.length === 0)) {
    const commonProbePaths = [
      'package.json',
      'package-lock.json',
      'requirements.txt',
      'pyproject.toml',
      'Pipfile',
      'Pipfile.lock',
      'poetry.lock',
      'frontend/package.json',
      'frontend/package-lock.json',
      'backend/requirements.txt',
      'backend/pyproject.toml',
      'backend/poetry.lock',
      'client/package.json',
      'client/package-lock.json',
      'server/requirements.txt',
      'server/package.json',
      'server/package-lock.json',
    ];

    for (const probePath of commonProbePaths) {
      treeFiles.push({ path: probePath, type: 'blob' });
    }
  }

  // Step 3: Filter discovered files for supported manifests and exclude ignored directories
  const matchedManifestEntries: Array<{
    path: string;
    fileName: string;
    directory: string;
    project: string;
    ecosystem: 'npm' | 'PyPI';
  }> = [];

  for (const entry of treeFiles) {
    if (entry.type && entry.type !== 'blob') continue;

    const normalizedPath = entry.path.replace(/\\/g, '/');

    // Filter by subpath if user explicitly requested one
    if (cleanSubpath && !normalizedPath.startsWith(cleanSubpath + '/') && normalizedPath !== cleanSubpath) {
      continue;
    }

    // Ignore node_modules, venv, .git, etc.
    if (isIgnoredPath(normalizedPath)) {
      continue;
    }

    const fileName = normalizedPath.split('/').pop() || '';
    const { isManifest, ecosystem } = classifyManifestFile(fileName);

    if (isManifest && ecosystem) {
      const { directory, project } = extractProjectContext(normalizedPath);
      matchedManifestEntries.push({
        path: normalizedPath,
        fileName,
        directory,
        project,
        ecosystem,
      });
    }
  }

  // Deduplicate matched paths
  const uniqueManifestMap = new Map<string, typeof matchedManifestEntries[0]>();
  for (const m of matchedManifestEntries) {
    if (!uniqueManifestMap.has(m.path)) {
      uniqueManifestMap.set(m.path, m);
    }
  }

  const detectedFiles = Array.from(uniqueManifestMap.keys()).sort();

  if (detectedFiles.length === 0) {
    throw new Error(
      `No supported dependency manifests found in repository "${owner}/${cleanRepo}" at branch "${ref}". Scanned for package.json, package-lock.json, npm-shrinkwrap.json, requirements.txt, requirements-dev.txt, pyproject.toml, Pipfile, Pipfile.lock, poetry.lock.`
    );
  }

  // Step 4: Fetch contents for all detected manifests concurrently
  const manifests: RawManifestFile[] = [];
  const fetchPromises = Array.from(uniqueManifestMap.values()).map(async (entry) => {
    const raw = await fetchRawFileContent(entry.path);
    if (raw !== null) {
      manifests.push({
        path: entry.path,
        fileName: entry.fileName,
        directory: entry.directory,
        project: entry.project,
        ecosystem: entry.ecosystem,
        rawContent: raw,
      });
    }
  });

  await Promise.all(fetchPromises);

  // Backwards-compatibility root package.json / lockfile parsing
  let primaryPackageJson: Record<string, unknown> | null = null;
  let primaryLockfile: Record<string, unknown> | null = null;

  const rootPkg = manifests.find((m) => m.fileName === 'package.json');
  if (rootPkg) {
    try {
      primaryPackageJson = JSON.parse(rootPkg.rawContent);
    } catch {
      // Handled in dependencyTree parser
    }
  }

  const rootLock = manifests.find((m) => m.fileName === 'package-lock.json' || m.fileName === 'npm-shrinkwrap.json');
  if (rootLock) {
    try {
      primaryLockfile = JSON.parse(rootLock.rawContent);
    } catch {
      // Handled in dependencyTree parser
    }
  }

  return {
    owner,
    repo: cleanRepo,
    branch: ref,
    subpath: cleanSubpath,
    detectedFiles,
    manifests,
    treeCompleteness,
    packageJson: primaryPackageJson,
    lockfile: primaryLockfile,
  };
}
