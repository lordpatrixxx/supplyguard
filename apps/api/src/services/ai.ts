import type { PackageNode, Remediation } from '../types/index.js';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/**
 * Generates AI remediation guidance for a flagged package using the Gemini API.
 * Falls back to a deterministic, safe templated response if the API key is missing or the call fails.
 */
export async function generateRemediation(
  pkg: PackageNode
): Promise<Remediation> {
  const apiKey = process.env.GEMINI_API_KEY;

  // If no API key, use template fallback immediately
  if (!apiKey) {
    return generateTemplateFallback(pkg);
  }

  try {
    const prompt = buildPrompt(pkg);

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              why_risky: { type: 'STRING' },
              fix: { type: 'STRING' },
              fix_command: { type: 'STRING' },
            },
            required: ['why_risky', 'fix', 'fix_command'],
          },
          temperature: 0.2,
          maxOutputTokens: 512,
        },
      }),
    });

    if (!response.ok) {
      console.error(`[Gemini] API error: ${response.status} ${response.statusText}`);
      return generateTemplateFallback(pkg);
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return generateTemplateFallback(pkg);
    }

    const parsed = JSON.parse(text) as Remediation;

    if (parsed.why_risky && parsed.fix && parsed.fix_command) {
      // Ensure no dangerous force flags
      if (parsed.fix_command.includes('--force')) {
        parsed.fix_command = parsed.fix_command.replace(/--force/g, '').trim();
      }
      return parsed;
    }

    return generateTemplateFallback(pkg);
  } catch (err) {
    console.error('[Gemini] Generation error:', err);
    return generateTemplateFallback(pkg);
  }
}

function buildPrompt(pkg: PackageNode): string {
  const vulnSummaries = pkg.vulnerabilities
    .slice(0, 3)
    .map((v) => `- ${v.id} (${v.severity}, CVSS ${v.cvss}): ${v.summary}${v.fixedIn ? ` (Fixed in: ${v.fixedIn})` : ''}`)
    .join('\n');

  const depPath = pkg.path.join(' → ');

  return `You are a software supply-chain security analyzer. Explain verified structured findings objectively and provide safe remediation steps.

Package: ${pkg.name}@${pkg.version}
SupplyGuard Risk Score: ${pkg.riskScore}/100
Advisory Severity: ${pkg.advisorySeverity}
Direct dependency: ${pkg.isDirect ? 'Yes' : 'No (transitive)'}
Dependency depth: ${pkg.depth}
Downstream dependents count: ${pkg.dependentCount}
Dependency path: ${depPath}
${pkg.typosquatFlag ? `Typosquat note: Similar to "${pkg.typosquatFlag.similarTo}" (${pkg.typosquatFlag.similarity}% similarity, edit distance: ${pkg.typosquatFlag.distance})` : ''}
${pkg.confusionFlag ? `Dependency confusion note: ${pkg.confusionFlag.reason}` : ''}

Known vulnerabilities:
${vulnSummaries || 'None reported'}

Rules:
1. Explain why this package was flagged using safe, objective wording (e.g. "This package was flagged because its installed version matches a known vulnerable range" rather than declarative statements of malice).
2. Recommend a safe, precise upgrade command (e.g., "npm install ${pkg.name}@<fixedVersion>") or manual review. NEVER recommend "npm audit fix --force".
3. Return a JSON object with:
   - "why_risky": 1-2 sentence plain-language factual explanation.
   - "fix": 1-2 sentence actionable developer guidance.
   - "fix_command": The exact, non-destructive CLI command.`;
}

/**
 * Deterministic, safe template fallback when Gemini API key is not present.
 */
function generateTemplateFallback(pkg: PackageNode): Remediation {
  const topVuln = pkg.vulnerabilities[0];

  let why_risky: string;
  let fix: string;
  let fix_command: string;

  if (pkg.typosquatFlag) {
    why_risky = `The package name "${pkg.name}" is ${pkg.typosquatFlag.similarity}% similar to the popular package "${pkg.typosquatFlag.similarTo}" (edit distance: ${pkg.typosquatFlag.distance}). This pattern indicates a potential typosquatting risk.`;
    fix = `Verify whether this is the intended package. If not, replace it with the verified upstream package "${pkg.typosquatFlag.similarTo}".`;
    fix_command = `npm uninstall ${pkg.name} && npm install ${pkg.typosquatFlag.similarTo}`;
  } else if (pkg.confusionFlag) {
    why_risky = `This package was flagged for potential dependency-confusion risk: ${pkg.confusionFlag.reason}`;
    fix = `Ensure internal package scopes are mapped to your private registry in your project's .npmrc file to prevent public namespace substitution.`;
    fix_command = `npm config get @${pkg.name.split('/')[0]?.replace(/^@/, '')}:registry`;
  } else if (topVuln) {
    why_risky = `${pkg.name}@${pkg.version} was flagged because its installed version contains known vulnerability ${topVuln.id} (${topVuln.severity}, CVSS ${topVuln.cvss}/10): ${topVuln.summary}`;
    if (topVuln.fixedIn) {
      fix = `Upgrade to version ${topVuln.fixedIn} or later, which resolves ${topVuln.id}.`;
      fix_command = `npm install ${pkg.name}@${topVuln.fixedIn}`;
    } else {
      fix = `No direct patch version is currently published for ${topVuln.id}. Review upstream advisories or evaluate alternative packages.`;
      fix_command = `npm outdated ${pkg.name}`;
    }
  } else {
    why_risky = `${pkg.name}@${pkg.version} was flagged due to dependency maintenance and exposure signals (${pkg.reputation.signals.join(', ') || 'limited maintenance'}).`;
    fix = `Audit package usage and consider upgrading to an actively maintained alternative.`;
    fix_command = `npm outdated ${pkg.name}`;
  }

  return { why_risky, fix, fix_command };
}
