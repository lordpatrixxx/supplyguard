import React from 'react'
import { Activity } from 'lucide-react'

interface StatCardProps {
  icon?: React.ReactNode
  label: string
  value: string | number
  sublabel?: string
  accentColor?: string
}

export function StatCard({ icon, label, value, sublabel, accentColor }: StatCardProps) {
  return (
    <div className="panel p-4 flex flex-col gap-2 animate-fade-in bg-surface-container rounded-xl border border-outline-variant/30">
      <div className="flex items-center gap-2">
        <span className="w-5 h-5 flex items-center justify-center text-primary" style={{ color: accentColor }}>
          {icon || <Activity className="w-4 h-4" />}
        </span>
        <span className="text-label-caps text-xs uppercase tracking-wider text-outline">
          {label}
        </span>
      </div>
      <div
        className="text-2xl font-bold tabular-nums text-on-surface"
        style={{ color: accentColor }}
      >
        {value}
      </div>
      {sublabel && (
        <span className="text-xs text-on-surface-variant">
          {sublabel}
        </span>
      )}
    </div>
  )
}
