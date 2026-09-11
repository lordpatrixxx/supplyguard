interface RiskBadgeProps {
  tier: 'safe' | 'medium' | 'critical'
  score?: number
  size?: 'sm' | 'md'
}

const tierConfig = {
  critical: { label: 'CRITICAL', className: 'badge-critical' },
  medium: { label: 'MEDIUM', className: 'badge-warning' },
  safe: { label: 'SAFE', className: 'badge-safe' },
}

export function RiskBadge({ tier, score, size = 'md' }: RiskBadgeProps) {
  const config = tierConfig[tier]
  const padding = size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1'

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-label-caps rounded-sm ${config.className} ${padding}`}
    >
      {config.label}
      {score !== undefined && (
        <span className="tabular-nums">{score}</span>
      )}
    </span>
  )
}
