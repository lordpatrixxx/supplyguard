interface StatCardProps {
  icon: string
  label: string
  value: string | number
  sublabel?: string
  accentColor?: string
}

export function StatCard({ icon, label, value, sublabel, accentColor }: StatCardProps) {
  return (
    <div className="panel p-4 flex flex-col gap-2 animate-fade-in">
      <div className="flex items-center gap-2">
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 18, color: accentColor || 'var(--color-info)' }}
        >
          {icon}
        </span>
        <span className="text-label-caps" style={{ color: 'var(--color-info)' }}>
          {label}
        </span>
      </div>
      <div
        className="text-display-lg tabular-nums"
        style={{ color: accentColor || 'var(--color-text-primary)' }}
      >
        {value}
      </div>
      {sublabel && (
        <span className="text-body-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {sublabel}
        </span>
      )}
    </div>
  )
}
