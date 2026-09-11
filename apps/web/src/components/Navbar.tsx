import { Link, useLocation } from 'react-router-dom'

export function Navbar() {
  const location = useLocation()

  const navLinks = [
    { path: '/', label: 'Scan', icon: 'radar' },
    { path: '/history', label: 'History', icon: 'history' },
  ]

  return (
    <nav
      className="sticky top-0 z-50 flex items-center justify-between px-6 py-3"
      style={{
        background: 'var(--color-surface-container-lowest)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      {/* Logo & Brand */}
      <Link to="/" className="flex items-center gap-3 no-underline">
        <div
          className="flex items-center justify-center rounded-lg"
          style={{
            width: 36,
            height: 36,
            background: 'linear-gradient(135deg, var(--color-primary-container), var(--color-primary))',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--color-surface)' }}>
            shield
          </span>
        </div>
        <span
          className="text-headline-sm"
          style={{ color: 'var(--color-text-primary)' }}
        >
          SupplyGuard
        </span>
      </Link>

      {/* Navigation Links */}
      <div className="flex items-center gap-1">
        {navLinks.map((link) => {
          const isActive = location.pathname === link.path
          return (
            <Link
              key={link.path}
              to={link.path}
              className="flex items-center gap-2 px-4 py-2 rounded-md no-underline transition-colors"
              style={{
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                background: isActive ? 'rgba(79, 209, 174, 0.08)' : 'transparent',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                {link.icon}
              </span>
              <span className="text-body-md font-medium">{link.label}</span>
            </Link>
          )
        })}

        {/* Initials Avatar (no stock photo per build prompt) */}
        <div
          className="ml-4 flex items-center justify-center rounded-md"
          style={{
            width: 34,
            height: 34,
            background: 'var(--color-surface-container-high)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-primary)',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          SG
        </div>
      </div>
    </nav>
  )
}
