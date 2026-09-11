import { useState } from 'react'
import { Link2, Loader2, Search } from 'lucide-react'

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
          <Link2 className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-primary" />
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
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
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
