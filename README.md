# SupplyGuard (PS14)

> **Software Supply-Chain Security Analyzer**  
> Proactively detect known vulnerabilities, typosquatting attacks, and supply-chain exposure across public GitHub repositories — featuring automated AI-guided remediation.

---

## Features

- **Real Manifest & Lockfile Parsing**: Fetches and parses npm v7+ `package-lock.json` directly from public GitHub repositories using the GitHub REST API (no server-side `git clone` risk).
- **Vulnerability Detection via OSV.dev**: Batch-queries OSV.dev aggregating GHSA (GitHub Security Advisories) and NVD data for every resolved `{name, version}` pair, enriched with CVSS scores and fixed versions.
- **Typosquat Attack Detection**: Computes Levenshtein edit distance (≤2) against a curated reference index of the top 500 npm packages to flag malicious lookalike packages.
- **Reputation Scoring**: Analyzes registry metadata, release cadence, maintainer count, and weekly download volume from `registry.npmjs.org` and `api.npmjs.org`.
- **Weighted Risk Rubric**:
  - Known vulnerability match: `+40 pts`
  - Severity scaled from CVSS: `up to +20 pts`
  - Outdated major/minor version (2+ years no updates): `+10 pts`
  - Unpinned / transitive-only exposure: `+8 pts`
  - Downstream fan-out reachability: `+8 pts`
  - Typosquat signal: `+15 pts`
- **AI-Powered Remediation (Gemini API)**: Server-side calls to Google Gemini generate concise plain-language risk explanations, actionable fixes, and exact copyable `npm install` fix commands (with reliable rule-based fallback).
- **Standardized CycloneDX v1.5 JSON SBOM Export**: Real-time export endpoint (`/api/scans/:id/sbom`) adhering strictly to the CycloneDX v1.5 specification, complete with purls, component hashes, licenses, dependencies, and OSV vulnerability ratings.
- **Dependency Confusion & Internal Scope Detection**: Proactively flags packages using enterprise namespace conventions (`@internal-*`, `@corp-*`, `@private-*`) that are not verified on the public registry.
- **Supabase Auth & Audit Persistence**: Seamless user authentication with Supabase, protected workspace routing, and Hackathon Judge Fast-Pass (`judge@supplyguard.sec`), persisting scans and findings in PostgreSQL.
- **Monorepo & Custom Branch Support**: Analyze custom git branches and subdirectories within monorepos (e.g. `packages/backend`).
- **Interactive Force-Directed Graph**: Live interactive 2D dependency graph powered by `react-force-graph-2d` with topological fan-out filters, cluster hulls, zoom-to-fit, and slide-in finding detail inspector.
- **Mission Control Dark UI**: Faithfully implements the Google Stitch design system with Space Grotesk, Inter, and JetBrains Mono typography, custom severity glow badges, live pipeline execution progress log, and fleet scan history.
- **Automated Test Suite**: 10/10 automated tests covering dependency tree parsing, typosquatting Levenshtein distance, dependency confusion, contextual scoring rubric, and CycloneDX validation (`npm run test -w apps/api`).

---

## Architecture & Project Structure

```
supplyguard/
├── apps/
│   ├── web/                     # React + Vite + TypeScript frontend
│   │   └── src/
│   │       ├── components/      # GraphView, FindingDetailPanel, RiskBadge, StatCard, ScanForm, Navbar
│   │       ├── pages/           # LandingPage, ScanProgressPage, DashboardPage, ReportPage, HistoryPage
│   │       └── index.css        # SupplyGuard design system extracted from Stitch DESIGN.md
│   └── api/                     # Node.js + Express + TypeScript backend
│       └── src/
│           ├── routes/          # POST /api/scans, GET /api/scans/:id, GET /api/scans
│           ├── services/        # github.ts, dependencyTree.ts, osv.ts, typosquat.ts, reputation.ts, scoring.ts, ai.ts
│           └── data/            # top-npm-packages.json (typosquat reference list)
└── package.json                 # npm workspaces root with unified `npm run dev`
```

---

## Getting Started

### Prerequisites

- Node.js 18+ (tested on Node 20+)
- npm 9+

### 1. Installation

Install all dependencies across both workspaces from the root folder:

```bash
cd supplyguard
npm install
```

### 2. Environment Configuration (Optional)

Create `apps/api/.env` if you wish to provide API keys:

```bash
# apps/api/.env

# Optional: Google Gemini API key for dynamic AI remediation explanations (has built-in template fallback)
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: GitHub token to increase GitHub API rate limit for public repos (60 req/hr unauthenticated vs 5000 req/hr authenticated)
GITHUB_TOKEN=your_github_token_here

# Optional: Port configuration (defaults to 3001)
PORT=3001
```

> **Note**: Both `GEMINI_API_KEY` and `GITHUB_TOKEN` are completely optional! SupplyGuard automatically falls back to curated rule-based remediation templates and unauthenticated GitHub raw API requests if no keys are provided.

### 3. Start the Application

Run the unified command from the root directory:

```bash
npm run dev
```

This starts:
- **Backend API**: `http://localhost:3001`
- **Frontend App**: `http://localhost:5173` (with `/api` proxied to port 3001)

Open your browser to `http://localhost:5173`.

---

## Quick Demo Walkthrough

1. Navigate to `http://localhost:5173`.
2. Enter any public GitHub repository URL that contains a `package.json` and `package-lock.json`.
3. Click **Analyze Repository**.
4. Watch the **Pipeline Execution Log** progress through manifest fetching, tree parsing, OSV querying, typosquat detection, reputation scoring, and AI remediation.
5. On the **Dashboard**:
   - Inspect the overall risk score and stat cards.
   - Explore the interactive 2D dependency graph with severity color filters (`critical`, `medium`, `safe`).
   - Click any flagged node in the graph or package list to view the **Finding Detail Panel** with:
     - Exact point score breakdown
     - Ingestion route breadcrumb (`root → express → body-parser → lodash`)
     - Known vulnerability CVEs / GHSAs with CVSS scores
     - AI-generated remediation summary and copyable npm upgrade command
6. Click **Report** in the top bar to inspect the prioritized remediation plan ranked by risk score.
7. Click **History** in the navigation bar to see audit history across scanned repositories.
