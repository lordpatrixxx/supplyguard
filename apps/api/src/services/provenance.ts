import type { ProvenanceSignals } from '../types/index.js';

/**
 * Evaluates build provenance signals honestly and transparently based on
 * repository linkage, registry metadata, and lockfile integrity.
 */
export function evaluateProvenance(
  pkgData?: {
    resolved?: string;
    integrity?: string;
  },
  registryData?: {
    repositoryUrl?: string;
    hasRegistryMeta?: boolean;
  }
): ProvenanceSignals {
  // Check lockfile integrity hash
  const lockfileIntegrity: 'Present' | 'Missing' =
    pkgData?.integrity && (pkgData.integrity.startsWith('sha512-') || pkgData.integrity.startsWith('sha1-') || pkgData.integrity.startsWith('sha256-'))
      ? 'Present'
      : 'Missing';

  // Check registry metadata presence
  const registryMetadata: 'Available' | 'Unpublished' | 'Private' =
    registryData?.hasRegistryMeta !== false ? 'Available' : 'Unpublished';

  // Check source repository linkage
  let sourceRepo: 'Available' | 'Missing' | 'Mismatch' = 'Missing';
  if (registryData?.repositoryUrl && registryData.repositoryUrl.trim().length > 0) {
    sourceRepo = 'Available';
  }

  return {
    sourceRepo,
    sourceRepoUrl: registryData?.repositoryUrl,
    registryMetadata,
    lockfileIntegrity,
    buildAttestation: 'Not available', // Transparent MVP statement: do not claim SLSA 3
  };
}
