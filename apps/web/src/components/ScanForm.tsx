import { useState } from 'react'

interface ScanFormProps {
  onSubmit: (repoUrl: string) => void
  isLoading?: boolean
}

export function ScanForm({ onSubmit, isLoading }: ScanFormProps) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmed = url.trim()
    if (!trimmed) {
      setError('Please enter a repository URL')
      return
    }

    let formatted = trimmed
    if (!/^https?:\/\//i.test(formatted)) {
      formatted = `https://${formatted}`
    }

    const githubPattern = /^https?:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/i
    if (!githubPattern.test(formatted)) {
      setError('Please enter a valid GitHub repository URL (e.g., https://github.com/owner/repo)')
      return
    }

    onSubmit(formatted)
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <span
            className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2"
            style={{ fontSize: 20, color: 'var(--color-info)' }}
          >
            link
          </span>
          <input
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              setError('')
            }}
            placeholder="https://github.com/owner/repository"
            className="input-field w-full pl-10 pr-4 py-3"
            style={{ fontSize: 14 }}
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          className="btn-primary flex items-center gap-2 whitespace-nowrap"
          disabled={isLoading}
          style={{ opacity: isLoading ? 0.7 : 1 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            {isLoading ? 'hourglass_top' : 'radar'}
          </span>
          {isLoading ? 'Scanning...' : 'Analyze Repository'}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-body-sm" style={{ color: 'var(--color-critical)' }}>
          {error}
        </p>
      )}
    </form>
  )
}
