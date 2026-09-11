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

  // Fetch package.json
  let packageJson: Record<string, unknown> | null = null;
  try {
    const pkgRes = await fetch(`${baseUrl}/${encodeURI(pkgFilePath)}?ref=${encodeURIComponent(ref)}`, { headers });
    if (pkgRes.ok) {
      packageJson = (await pkgRes.json()) as Record<string, unknown>;
    }
  } catch {
    // package.json not found
  }

  // Fetch package-lock.json
  let lockfile: Record<string, unknown> | null = null;
  try {
    const lockRes = await fetch(`${baseUrl}/${encodeURI(lockFilePath)}?ref=${encodeURIComponent(ref)}`, { headers });
    if (lockRes.ok) {
      lockfile = (await lockRes.json()) as Record<string, unknown>;
    } else if (cleanSubpath) {
      // In monorepos, check root package-lock.json if subpath doesn't have its own
      const rootLockRes = await fetch(`${baseUrl}/package-lock.json?ref=${encodeURIComponent(ref)}`, { headers });
      if (rootLockRes.ok) {
        lockfile = (await rootLockRes.json()) as Record<string, unknown>;
      }
    }
  } catch {
    // lockfile not found
  }

  return { packageJson, lockfile, owner, repo: cleanRepo, subpath: cleanSubpath, branch: ref };
}
