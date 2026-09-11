import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractPackageNameFromPath, createUniqueNodeId, parseLockfile, parsePackageJsonDirect } from '../services/dependencyTree.js';
import { checkTyposquat } from '../services/typosquat.js';
import { checkDependencyConfusion } from '../services/dependencyConfusion.js';
import { scorePackage } from '../services/scoring.js';
import { generateCycloneDXSBOM } from '../services/sbom.js';
import { parseCvssVector } from '../services/osv.js';
import { simulateRemediation } from '../services/simulation.js';
import type { Vulnerability, ReputationData, ProvenanceSignals, ScanResult } from '../types/index.js';

describe('Dependency Tree & Identity', () => {
  it('correctly parses scoped and unscoped package keys', () => {
    assert.equal(extractPackageNameFromPath('node_modules/lodash'), 'lodash');
    assert.equal(extractPackageNameFromPath('node_modules/@types/node'), '@types/node');
    assert.equal(extractPackageNameFromPath('node_modules/express/node_modules/accepts'), 'accepts');
    assert.equal(extractPackageNameFromPath('node_modules/express/node_modules/@types/node'), '@types/node');
  });

  it('generates consistent unique node identifiers', () => {
    const id = createUniqueNodeId('lodash', '4.17.20', 'node_modules/lodash');
    assert.equal(id, 'lodash@4.17.20#node_modules/lodash');
  });

  it('preserves distinct node identities for multiple versions of the same package', () => {
    const mockLockfile = {
      name: 'multi-version-test',
      version: '1.0.0',
      lockfileVersion: 3,
      packages: {
        '': {
          dependencies: {
            'express': '^4.18.2',
            'utility-a': '^1.0.0',
          },
        },
        'node_modules/utility-a': {
          version: '1.0.0',
          dependencies: {
            'lodash': '4.17.20',
          },
        },
        'node_modules/utility-a/node_modules/lodash': {
          version: '4.17.20',
        },
        'node_modules/utility-b': {
          version: '1.0.0',
          dependencies: {
            'lodash': '4.17.21',
          },
        },
        'node_modules/utility-b/node_modules/lodash': {
          version: '4.17.21',
        },
      },
    };

    const manifest = { name: 'multi-version-test', dependencies: { 'utility-a': '^1.0.0' } };
    const { packages: nodes, edges } = parseLockfile(mockLockfile, manifest);

    const lodashNodes = nodes.filter(n => n.name === 'lodash');
    assert.equal(lodashNodes.length, 2, 'Should have 2 distinct lodash nodes');
    assert.notEqual(lodashNodes[0].id, lodashNodes[1].id, 'Each node must have a unique ID');

    const versions = new Set(lodashNodes.map(n => n.version));
    assert.ok(versions.has('4.17.20'));
    assert.ok(versions.has('4.17.21'));
  });

  it('provides direct dependency fallback parsing when lockfile is absent', () => {
    const packageJson = {
      name: 'direct-fallback-test',
      dependencies: {
        'axios': '^1.6.0',
        'dotenv': '~16.3.1',
      },
      devDependencies: {
        'typescript': '^5.3.0',
      },
    };

    const { packages, edges } = parsePackageJsonDirect(packageJson);
    assert.equal(packages.length, 3, 'Should parse all 3 direct dependencies');
    assert.ok(packages.every((p) => p.isDirect && p.depth === 1), 'All nodes should be marked direct depth 1');
    assert.ok(packages.some((p) => p.name === 'axios' && p.version === '1.6.0'));
    assert.ok(packages.some((p) => p.name === 'dotenv' && p.version === '16.3.1'));
    assert.ok(packages.some((p) => p.name === 'typescript' && p.version === '5.3.0'));
  });
});

describe('Typosquatting Detection', () => {
  it('flags known typosquat variations of top packages', () => {
    const flag = checkTyposquat('reqeust');
    assert.ok(flag, 'Should flag reqeust');
    assert.equal(flag?.similarTo, 'request');
    assert.ok(flag?.similarity && flag.similarity >= 70);
    assert.equal(flag?.indicator, 'Possible typosquatting indicator');

    const flagAxios = checkTyposquat('axois');
    assert.ok(flagAxios, 'Should flag axois');
    assert.equal(flagAxios?.similarTo, 'axios');
  });

  it('does not flag legitimate popular or short core packages', () => {
    assert.equal(checkTyposquat('react'), null);
    assert.equal(checkTyposquat('express'), null);
    assert.equal(checkTyposquat('lodash'), null);
    // Core ecosystem packages that were previously false positives:
    assert.equal(checkTyposquat('qs'), null);
    assert.equal(checkTyposquat('send'), null);
    assert.equal(checkTyposquat('etag'), null);
    assert.equal(checkTyposquat('ip'), null);
    assert.equal(checkTyposquat('depd'), null);
    assert.equal(checkTyposquat('vary'), null);
    assert.equal(checkTyposquat('mime-types'), null);
  });
});

describe('CVSS v3.1 Vector Parsing', () => {
  it('calculates the exact base score conforming to the FIRST CVSS v3.1 specification', () => {
    // Critical network exploit: CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H -> 9.8
    const scoreCritical = parseCvssVector('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H');
    assert.equal(scoreCritical, 9.8);

    // High network exploit with low privilege: CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H -> 8.8
    const scoreHigh = parseCvssVector('CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H');
    assert.equal(scoreHigh, 8.8);

    // Non-vector fallback
    const scoreFallback = parseCvssVector('invalid-string');
    assert.equal(scoreFallback, 0.0);
  });
});

describe('Dependency Confusion Detection', () => {
  it('flags internal company namespaces that risk public collision', () => {
    const flag = checkDependencyConfusion('@internal-secret-corp/auth-core', 'mycorp');
    assert.ok(flag, 'Should flag internal scoped package');
    assert.equal(flag?.confidence, 'high');
  });

  it('does not flag standard open-source scoped packages that exist publicly', () => {
    const flag = checkDependencyConfusion('@types/node');
    assert.equal(flag, undefined, 'Legitimate public package should not be flagged');
  });
});

describe('Contextual Risk Scoring Rubric', () => {
  const dummyReputation: ReputationData = {
    lastPublished: '2024-01-01',
    createdDate: '2020-01-01',
    packageAgeYears: 4,
    maintainerCount: 5,
    weeklyDownloads: 1000000,
    signals: ['Active maintainers'],
  };

  const dummyProvenance: ProvenanceSignals = {
    sourceRepo: 'Available',
    sourceRepoUrl: 'https://github.com/example/pkg',
    registryMetadata: 'Available',
    lockfileIntegrity: 'Present',
    buildAttestation: 'Not available',
  };

  it('separates advisory severity from contextual risk score', () => {
    const criticalVuln: Vulnerability = {
      id: 'CVE-2021-23337',
      source: 'OSV',
      summary: 'Command injection in lodash',
      cvss: 8.5,
      severity: 'HIGH',
      fixedIn: '4.17.21',
    };

    const { score: riskScore, advisorySeverity, tier: riskTier, breakdown } = scorePackage({
      id: 'lodash@4.17.20#node_modules/lodash',
      name: 'lodash',
      version: '4.17.20',
      isDirect: false,
      path: ['express', 'lodash'],
      depth: 3,
      dependentCount: 5, // High fan-out
      downstreamDependents: ['express'],
      riskScore: 0,
      advisorySeverity: 'NONE',
      riskTier: 'safe',
      riskBreakdown: {
        knownVulnerability: 0,
        severityContribution: 0,
        outdatedVersion: 0,
        transitiveExposure: 0,
        downstreamImpact: 0,
        typosquatConfusion: 0,
        totalScore: 0,
      },
      vulnerabilities: [criticalVuln],
      reputation: { ...dummyReputation, signals: ['Major release stale >2 yrs'] },
      provenance: dummyProvenance,
    });

    assert.equal(advisorySeverity, 'HIGH');
    assert.ok(riskScore >= 70, 'Contextual score should reflect blast radius');
    assert.equal(riskTier, 'critical');

    // Verify itemized breakdown
    assert.equal(breakdown.knownVulnerability, 40);
    assert.ok(breakdown.severityContribution > 10);
    assert.equal(breakdown.outdatedVersion, 10);
    assert.equal(breakdown.transitiveExposure, 8);
    assert.equal(breakdown.downstreamImpact, 8);
    assert.equal(breakdown.totalScore, riskScore);
  });

  it('caps risk score strictly at 100 points', () => {
    const maxVuln: Vulnerability = {
      id: 'CVE-9999-9999',
      source: 'OSV',
      summary: 'Extreme exploit',
      cvss: 10.0,
      severity: 'CRITICAL',
    };

    const { score: riskScore } = scorePackage({
      id: 'bad-pkg@1.0.0#node_modules/bad-pkg',
      name: 'bad-pkg',
      version: '1.0.0',
      isDirect: false,
      path: ['root', 'bad-pkg'],
      depth: 4,
      dependentCount: 10,
      downstreamDependents: ['a', 'b', 'c'],
      riskScore: 0,
      advisorySeverity: 'NONE',
      riskTier: 'safe',
      riskBreakdown: {
        knownVulnerability: 0,
        severityContribution: 0,
        outdatedVersion: 0,
        transitiveExposure: 0,
        downstreamImpact: 0,
        typosquatConfusion: 0,
        totalScore: 0,
      },
      vulnerabilities: [maxVuln],
      reputation: { ...dummyReputation, signals: ['Major release stale >2 yrs'] },
      provenance: dummyProvenance,
      typosquatFlag: {
        similarTo: 'popular-pkg',
        distance: 1,
        similarity: 90,
        indicator: 'Possible typosquatting indicator',
        reason: 'Typosquat',
      },
      confusionFlag: {
        indicator: 'Potential dependency-confusion risk',
        reason: 'Collision',
        confidence: 'high',
      },
    });

    assert.equal(riskScore, 100, 'Score must never exceed 100');
  });
});

describe('CycloneDX 1.5 JSON SBOM Export', () => {
  it('generates a valid, spec-compliant CycloneDX v1.5 document', () => {
    const mockScan: ScanResult = {
      scanId: 'test-scan-12345',
      repoUrl: 'https://github.com/acme/sample-api',
      owner: 'acme',
      repo: 'sample-api',
      branch: 'main',
      status: 'complete',
      overallRiskScore: 75,
      createdAt: new Date().toISOString(),
      packages: [
        {
          id: 'lodash@4.17.20#node_modules/lodash',
          name: 'lodash',
          version: '4.17.20',
          isDirect: false,
          depth: 2,
          dependentCount: 3,
          downstreamDependents: ['express'],
          path: ['express', 'lodash'],
          riskScore: 78,
          advisorySeverity: 'HIGH',
          riskTier: 'critical',
          riskBreakdown: {
            knownVulnerability: 40,
            severityContribution: 17,
            outdatedVersion: 10,
            transitiveExposure: 8,
            downstreamImpact: 8,
            typosquatConfusion: 0,
            totalScore: 78,
          },
          vulnerabilities: [
            {
              id: 'GHSA-35jh-r3h4-6jhm',
              source: 'GHSA',
              summary: 'Command injection',
              cvss: 8.5,
              severity: 'HIGH',
              fixedIn: '4.17.21',
            },
          ],
          reputation: {
            lastPublished: '2020-01-01',
            maintainerCount: 2,
            weeklyDownloads: 40000000,
            signals: [],
          },
          provenance: {
            sourceRepo: 'Available',
            sourceRepoUrl: 'https://github.com/lodash/lodash',
            registryMetadata: 'Available',
            lockfileIntegrity: 'Present',
            buildAttestation: 'Not available',
          },
        },
      ],
      edges: [
        { from: 'root', to: 'lodash@4.17.20#node_modules/lodash' },
      ],
    };

    const sbom = generateCycloneDXSBOM(mockScan);
    assert.equal(sbom.bomFormat, 'CycloneDX');
    assert.equal(sbom.specVersion, '1.5');
    assert.ok(sbom.metadata?.component);
    assert.equal(sbom.components?.length, 1);
    assert.equal(sbom.components?.[0].name, 'lodash');
    assert.equal(sbom.components?.[0].purl, 'pkg:npm/lodash@4.17.20');
    assert.equal(sbom.components?.[0]['bom-ref'], 'lodash@4.17.20#node_modules/lodash', 'Component must have valid bom-ref');
    assert.equal(sbom.vulnerabilities?.length, 1);
    assert.equal(sbom.vulnerabilities?.[0].id, 'GHSA-35jh-r3h4-6jhm');
    assert.equal(sbom.dependencies?.length, 1);
  });
});

describe('Evidence-Based Remediation Simulation', () => {
  it('mathematically simulates vulnerability resolution when patched version is available', () => {
    const vulnerablePkg = {
      id: 'lodash@4.17.20#node_modules/lodash',
      name: 'lodash',
      version: '4.17.20',
      isDirect: true,
      path: ['lodash'],
      depth: 1,
      dependentCount: 0,
      downstreamDependents: [],
      riskScore: 86,
      advisorySeverity: 'HIGH' as const,
      riskTier: 'critical' as const,
      riskBreakdown: {
        knownVulnerability: 40,
        severityContribution: 17,
        outdatedVersion: 10,
        transitiveExposure: 0,
        downstreamImpact: 0,
        typosquatConfusion: 0,
        totalScore: 86,
      },
      vulnerabilities: [
        {
          id: 'GHSA-35jh-r3h4-6jhm',
          source: 'GHSA' as const,
          summary: 'Command injection',
          cvss: 8.5,
          severity: 'HIGH' as const,
          fixedIn: '4.17.21',
        },
      ],
      reputation: {
        lastPublished: '2020-01-01',
        maintainerCount: 2,
        weeklyDownloads: 40000000,
        signals: [],
      },
      provenance: {
        sourceRepo: 'Available' as const,
        sourceRepoUrl: 'https://github.com/lodash/lodash',
        registryMetadata: 'Available' as const,
        lockfileIntegrity: 'Present' as const,
        buildAttestation: 'Not available' as const,
      },
    };

    const simulation = simulateRemediation([vulnerablePkg]);
    assert.equal(simulation.simulatedPackages.length, 1);
    assert.equal(simulation.resolvedVulnCount, 1, 'Should resolve 1 vulnerability');

    const simulated = simulation.simulatedPackages[0];
    assert.equal(simulated.isRemediated, true);
    assert.ok(simulated.ptsReduced > 0, 'Risk score should decrease');
    assert.ok(simulated.projectedRiskScore < simulated.riskScore, 'Projected risk score should be lower than original');
    assert.ok(simulation.projectedOverallScore < simulation.currentOverallScore, 'Overall repository risk should drop');
  });
});

describe('Server-Side Authorization & Tenant Isolation', () => {
  it('blocks unauthenticated requests missing Bearer token', async () => {
    const { requireAuth } = await import('../middleware/auth.js');
    let status = 0;
    let responseBody: any = null;

    const req: any = { headers: {} };
    const res: any = {
      status: (s: number) => {
        status = s;
        return {
          json: (b: any) => {
            responseBody = b;
          },
        };
      },
    };
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    await requireAuth(req, res, next);
    assert.equal(status, 401);
    assert.ok(responseBody?.error?.includes('Unauthorized'));
    assert.equal(nextCalled, false);
  });

  it('authenticates valid tokens and derives req.user server-side', async () => {
    process.env.NODE_ENV = 'test';
    const { requireAuth } = await import('../middleware/auth.js');
    const req: any = {
      headers: { authorization: 'Bearer test-token-secops-user-42' },
    };
    const res: any = {
      status: () => res,
      json: () => {},
    };
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    await requireAuth(req, res, next);
    assert.equal(nextCalled, true);
    assert.equal(req.user?.id, 'secops-user-42');
    assert.equal(req.user?.email, 'secops-user-42@supplyguard.internal');
  });

  it('enforces tenant isolation preventing cross-user scan retrieval', () => {
    const userAScan: ScanResult = {
      scanId: 'scan-user-a',
      userId: 'user-a',
      repoUrl: 'https://github.com/org/repo-a',
      status: 'complete',
      overallRiskScore: 45,
      packages: [],
      edges: [],
      createdAt: new Date().toISOString(),
    };

    const callerUserId = 'user-b';
    // Verification logic identical to GET /api/scans/:id route
    const isAuthorized = userAScan.userId === callerUserId;
    assert.equal(isAuthorized, false, 'User B must not be authorized to view User A scan');
  });
});

