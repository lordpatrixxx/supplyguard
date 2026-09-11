/**
 * Fetches package.json and package-lock.json from a public GitHub repo
 * via the GitHub REST API (raw file fetch). No git clone — security constraint.
 * Supports branch and manifest subpath parameters.
 */

interface ManifestResult {
  packageJson: Record<string, unknown> | null;
  lockfile: Record<string, unknown> | null;
  owner: string;
  repo: string;
  subpath?: string;
  branch: string;
}

export async function fetchManifests(
  repoUrl: string,
  branch?: string,
  subpath?: string
): Promise<ManifestResult> {
  // Parse owner/repo from URL
  const match = repoUrl.match(/github\.com\/([\w.-]+)\/([\w.-]+)/);
  if (!match) {
    throw new Error(`Invalid GitHub URL: ${repoUrl}`);
  }

  const [, owner, repo] = match;
  const cleanRepo = repo.replace(/\.git$/, '');
  const ref = branch && branch.trim().length > 0 ? branch.trim() : 'HEAD';

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3.raw',
    'User-Agent': 'SupplyGuard/1.0',
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const baseUrl = `https://api.github.com/repos/${owner}/${cleanRepo}/contents`;

  // Clean subpath: "apps/web/" -> "apps/web"
  const cleanSubpath = subpath
    ? subpath.trim().replace(/^\/+|\/+$/g, '')
    : '';

  const pkgFilePath = cleanSubpath ? `${cleanSubpath}/package.json` : 'package.json';
  const lockFilePath = cleanSubpath ? `${cleanSubpath}/package-lock.json` : 'package-lock.json';

  // Helper to fetch file content: tries API first, then falls back to raw.githubusercontent.com for large files (> 1MB)
  async function fetchFileContent(filePath: string): Promise<Record<string, unknown> | null> {
    // 1. Try GitHub Contents API
    try {
      const apiUrl = `${baseUrl}/${encodeURI(filePath)}?ref=${encodeURIComponent(ref)}`;
      const res = await fetch(apiUrl, { headers });

      if (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0') {
        throw new Error('GitHub API rate limit exceeded (60 req/hr unauthenticated limit). Please configure GITHUB_TOKEN in environment variables to raise limit to 5,000 req/hr.');
      }

      if (res.ok) {
        const text = await res.text();
        return JSON.parse(text) as Record<string, unknown>;
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('rate limit')) throw err;
    }

    // 2. Fallback to raw.githubusercontent.com (bypasses 1MB API limit, supports up to 25MB)
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
        const rawText = await rawRes.text();
        return JSON.parse(rawText) as Record<string, unknown>;
      }
    } catch {
      // Non-fatal fallback
    }

    return null;
  }

  // Fetch package.json
  const packageJson = await fetchFileContent(pkgFilePath);

  // Fetch package-lock.json
  let lockfile = await fetchFileContent(lockFilePath);
  if (!lockfile && cleanSubpath) {
    // In monorepos, check root package-lock.json if subpath doesn't have its own
    lockfile = await fetchFileContent('package-lock.json');
  }

  return { packageJson, lockfile, owner, repo: cleanRepo, subpath: cleanSubpath, branch: ref };
}
