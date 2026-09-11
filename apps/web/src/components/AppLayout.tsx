import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import type { ScanResult } from '../types'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [showPolicyModal, setShowPolicyModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch recent scans to get active repo context
  const { data: scans } = useQuery<ScanResult[]>({
    queryKey: ['scans', user?.id],
    queryFn: async () => {
      const url = user?.id ? `/api/scans?userId=${encodeURIComponent(user.id)}` : '/api/scans'
      const res = await fetch(url)
      if (!res.ok) return []
      return res.json()
    },
  })

  // Extract scan ID from path if present (e.g. /app/scans/:id/...)
  const scanMatch = location.pathname.match(/\/scans\/([a-zA-Z0-9_-]+)/)
  const currentScanId = scanMatch ? scanMatch[1] : (scans && scans.length > 0 ? scans[0].scanId : null)
  const currentScan = scans?.find(s => s.scanId === currentScanId) || scans?.[0]

  const activeRepoName = currentScan
    ? currentScan.repoUrl.replace(/^https?:\/\/github\.com\//, '')
    : 'SupplyGuard Engine'

  const navItems = [
    {
      label: 'Intake & Scans',
      icon: 'dashboard',
      path: '/app',
      active: location.pathname === '/app',
    },
    {
      label: 'Dependency Graph',
      icon: 'hub',
      path: currentScanId ? `/app/scans/${currentScanId}/dashboard` : '/app',
      active: location.pathname.includes('/dashboard'),
    },
    {
      label: 'Findings & Remediation',
      icon: 'shield_with_heart',
      path: currentScanId ? `/app/scans/${currentScanId}/report` : '/app',
      active: location.pathname.includes('/report'),
    },
    {
      label: 'Scan History',
      icon: 'history',
      path: '/app/history',
      active: location.pathname === '/app/history',
    },
  ]

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    if (currentScanId) {
      navigate(`/app/scans/${currentScanId}/dashboard?q=${encodeURIComponent(searchQuery.trim())}`)
    } else {
      navigate(`/app/history?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/signin')
  }

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'U'

  return (
    <div className="min-h-screen bg-background text-on-surface antialiased">
      {/* ── Fixed Universal Top Header (Stitch Specification) ── */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-surface-container-lowest border-b border-surface-variant flex items-center justify-between px-margin-lg">
        {/* Left: Brand + Active Repo + Security Intel */}
        <div className="flex items-center gap-space-lg">
          <Link to="/app" className="flex items-center gap-space-sm no-underline">
            <div
              className="flex items-center justify-center rounded-lg shadow-sm"
              style={{
                width: 32,
                height: 32,
                background: 'linear-gradient(135deg, var(--color-primary-container), var(--color-primary))',
              }}
            >
              <span className="material-symbols-outlined text-[20px] text-surface">
                shield
              </span>
            </div>
            <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight">
              Supply<span className="text-primary-container">Guard</span>
            </span>
          </Link>

          <div className="h-5 w-[1px] bg-surface-variant"></div>

          {/* Active Context Repo Chip */}
          <div className="flex items-center gap-space-xs px-space-sm py-1 bg-surface-container border border-surface-variant rounded-lg">
            <span className="material-symbols-outlined text-on-surface-variant text-[16px]">
              inventory_2
            </span>
            <span className="font-code-sm text-code-sm text-on-surface font-medium max-w-[180px] truncate" title={activeRepoName}>
              {activeRepoName}
            </span>
            <span className="font-code-sm text-code-sm text-on-surface-variant">
              (main)
            </span>
          </div>

          {/* Security Intelligence Status Badge */}
          <div className="hidden xl:flex items-center gap-space-xs px-space-sm py-1 bg-surface-container border border-primary-container/30 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
            <span className="font-label-caps text-label-caps uppercase text-primary-container">
              Security Intelligence: Active
            </span>
          </div>
        </div>

        {/* Middle: Universal Search Bar */}
        <div className="hidden lg:flex items-center flex-1 max-w-md mx-space-xl">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <span className="material-symbols-outlined absolute left-space-sm top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search packages, CVEs, or dependencies..."
              className="w-full h-9 bg-surface-dim border border-surface-variant rounded-lg pl-9 pr-3 text-on-surface placeholder:text-outline font-code-sm text-code-sm focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
            />
          </form>
        </div>

        {/* Right: Actions + User Profile */}
        <div className="flex items-center gap-space-md">
          <Link
            to="/app"
            className="flex items-center gap-space-xs px-space-md py-1.5 bg-primary-container hover:bg-primary text-on-primary font-headline-sm text-[13px] rounded-lg transition-colors shadow-sm font-semibold no-underline"
          >
            <span className="material-symbols-outlined text-[18px]">radar</span>
            <span>New Scan</span>
          </Link>

          <div className="h-5 w-[1px] bg-surface-variant"></div>

          <button
            onClick={() => setShowPolicyModal(true)}
            className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors cursor-pointer border-none bg-transparent"
            title="Scoring Policy & Rules"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
          </button>

          {/* User Account Pill */}
          <div className="flex items-center gap-space-xs px-2 py-1 bg-surface-container rounded-lg border border-surface-variant" title={user?.email || 'SecOps Engineer'}>
            <div className="w-5 h-5 rounded-full bg-primary-container/20 border border-primary-container/40 flex items-center justify-center font-code-sm text-[11px] text-primary-container font-bold">
              {userInitial}
            </div>
            <span className="font-code-sm text-code-sm text-on-surface font-medium max-w-[120px] truncate">
              {user?.email ? user.email.split('@')[0] : 'SecOps'}
            </span>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="p-1.5 text-outline hover:text-error hover:bg-surface-container rounded-lg transition-colors cursor-pointer border-none bg-transparent"
            title="Sign Out"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </header>

      {/* ── Fixed Left Sidebar (Stitch Specification) ── */}
      <aside className="fixed left-0 top-16 bottom-0 w-64 bg-surface-dim border-r border-surface-variant z-40 flex flex-col justify-between overflow-y-auto">
        <div className="p-space-md">
          <div className="px-space-sm pb-space-sm text-outline font-label-caps text-label-caps uppercase">
            Telemetry &amp; Audit
          </div>

          <nav className="flex flex-col gap-space-xs">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.path}
                className={`flex items-center gap-space-sm px-space-sm py-space-sm rounded-lg transition-colors no-underline font-body-md text-body-md ${
                  item.active
                    ? 'bg-surface-container-high text-primary-container border-l-2 border-primary-container font-medium'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}

            <button
              onClick={() => setShowPolicyModal(true)}
              className="flex items-center gap-space-sm px-space-sm py-space-sm rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface font-body-md text-body-md transition-colors w-full text-left bg-transparent border-none cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">verified_user</span>
              <span>Policy &amp; Rules</span>
            </button>
          </nav>

          {/* Manifest Integrity Box */}
          <div className="mt-space-xl px-space-sm pb-space-sm text-outline font-label-caps text-label-caps uppercase">
            Manifest Integrity
          </div>
          <div className="flex flex-col gap-space-xs">
            <div className="p-space-sm bg-surface-container-low border border-surface-variant rounded-lg">
              <div className="flex items-center justify-between text-outline font-code-sm text-code-sm mb-1">
                <span>SBOM Sync</span>
                <span className="text-primary-container font-code-sm text-code-sm">CycloneDX 1.5</span>
              </div>
              <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden">
                <div className="bg-primary-container h-full w-full"></div>
              </div>
              <div className="mt-2 font-code-sm text-code-sm text-on-surface-variant truncate">
                sha256:7f4c...982b
              </div>
            </div>
          </div>
        </div>

        {/* Engine Version Footer */}
        <div className="p-space-md border-t border-surface-variant bg-surface-container-lowest">
          <div className="flex items-center justify-between text-outline font-code-sm text-code-sm">
            <span>Engine: v4.12-sec</span>
            <span className="material-symbols-outlined text-[16px] text-primary-container" title="Zero-Trust Analyzer">
              security
            </span>
          </div>
        </div>
      </aside>

      {/* ── Main Content Offset (Pl-64 and Pt-16) ── */}
      <div className="pl-64">
        <main className="w-full pt-16 min-h-screen bg-background text-on-surface">
          {children}
        </main>
      </div>

      {/* ── Policy & Rules Modal ── */}
      {showPolicyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface-container border border-surface-variant rounded-xl max-w-lg w-full p-space-xl shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-space-md mb-space-md border-b border-surface-variant">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary-container text-[22px]">
                  verified_user
                </span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">
                  Supply-Chain Policy &amp; Scoring Rubric
                </h2>
              </div>
              <button
                onClick={() => setShowPolicyModal(false)}
                className="text-outline hover:text-on-surface bg-transparent border-none cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-space-md text-body-sm text-on-surface-variant">
              <p>
                SupplyGuard calculates an itemized 0–100 contextual risk score combining advisory vulnerabilities and topological supply-chain exposure:
              </p>

              <div className="bg-surface-container-low p-space-md rounded-lg border border-surface-variant flex flex-col gap-2 font-code-sm text-code-sm">
                <div className="flex justify-between text-on-surface">
                  <span>Known vulnerability match (OSV.dev):</span>
                  <span className="text-secondary font-bold">+40 pts</span>
                </div>
                <div className="flex justify-between text-on-surface">
                  <span>Severity scaled from CVSS (CRITICAL/HIGH):</span>
                  <span className="text-secondary font-bold">up to +20 pts</span>
                </div>
                <div className="flex justify-between text-on-surface">
                  <span>Outdated package (&gt;2 yrs stale):</span>
                  <span className="text-tertiary font-bold">+10 pts</span>
                </div>
                <div className="flex justify-between text-on-surface">
                  <span>Downstream fan-out (&ge;3 dependents in graph):</span>
                  <span className="text-tertiary font-bold">+8 pts</span>
                </div>
                <div className="flex justify-between text-on-surface">
                  <span>Typosquat edit distance (&le;2 of top pkg):</span>
                  <span className="text-secondary font-bold">+15 pts</span>
                </div>
                <div className="flex justify-between text-on-surface">
                  <span>Dependency confusion namespace collision:</span>
                  <span className="text-secondary font-bold">+15 pts</span>
                </div>
              </div>

              <div className="p-space-sm bg-surface-container-high rounded-lg flex items-center justify-between text-code-sm">
                <span className="text-outline">Score Bounds</span>
                <span className="text-primary-container">Normalized 0 (Safe) to 100 (Critical)</span>
              </div>
            </div>

            <div className="mt-space-lg flex justify-end">
              <button
                onClick={() => setShowPolicyModal(false)}
                className="btn-primary"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
