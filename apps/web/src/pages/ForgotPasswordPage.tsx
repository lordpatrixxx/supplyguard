import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const ForgotPasswordPage: React.FC = () => {
  const { resetPassword } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [dispatched, setDispatched] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const { error } = await resetPassword(email);
    setLoading(false);

    if (error) {
      setErrorMsg(error.message || 'Failed to dispatch recovery instructions.');
    } else {
      setDispatched(true);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col justify-between font-body-md selection:bg-primary/20 selection:text-primary">
      {/* Top Header */}
      <header className="h-16 bg-surface-container-lowest border-b border-outline-variant/30 flex items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded bg-primary/10 border border-primary/40 flex items-center justify-center text-primary group-hover:border-primary transition-colors shadow-sm">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5zm0 4.5c2.48 0 4.5 2.02 4.5 4.5s-2.02 4.5-4.5 4.5-4.5-2.02-4.5-4.5 2.02-4.5 4.5-4.5z" />
            </svg>
          </div>
          <span className="font-headline-sm text-lg text-on-surface tracking-tight">
            Supply<span className="text-primary font-bold">Guard</span>
          </span>
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-code-sm uppercase tracking-wider bg-surface-container-high border border-outline-variant text-outline">
            Enterprise Security Console
          </span>
        </Link>

        <div className="flex items-center gap-4 text-xs font-code-sm">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded hover:bg-surface-container-high text-on-surface-variant transition-colors"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          <Link to="/signin" className="text-outline hover:text-on-surface transition-colors flex items-center gap-1">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>Return to Sign In</span>
          </Link>
        </div>
      </header>

      {/* Main Dual-Panel Auth Grid */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Left Panel: Recovery Protocol Context */}
          <div className="hidden md:flex md:col-span-5 flex-col gap-4 p-8 bg-surface-container-low border border-outline-variant/40 rounded-2xl shadow-xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-surface-container rounded-full text-[11px] font-code-sm text-primary border border-primary/20 self-start">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
              RECOVERY PROTOCOL
            </div>

            <h2 className="font-headline-md text-2xl font-bold text-on-surface">
              Account Access Recovery
            </h2>

            <p className="text-on-surface-variant text-sm leading-relaxed">
              Request a secure, time-bound password reset token verified via end-to-end cryptographic signatures.
            </p>

            <div className="p-4 bg-surface-container-lowest border border-outline-variant/30 rounded-xl font-code-sm text-xs flex flex-col gap-2">
              <div className="flex items-center justify-between text-outline border-b border-outline-variant/30 pb-1.5">
                <span>SECURITY LEVEL</span>
                <span className="text-primary font-mono">HIGH</span>
              </div>
              <div className="text-on-surface-variant">
                Token Validity: <span className="text-on-surface font-mono">15-minute TTL</span>
              </div>
              <div className="text-on-surface-variant">
                Account Protection: <span className="text-primary font-mono">Anti-Enumeration Guard</span>
              </div>
            </div>
          </div>

          {/* Right Panel: Reset Form Card */}
          <div className="md:col-span-7 p-8 sm:p-10 bg-surface-container-low border border-outline-variant/40 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-6 border-b border-outline-variant/30">
              <span className="font-code-sm text-[11px] text-outline uppercase tracking-wider">
                PASSWORD RECOVERY
              </span>
              <span className="font-code-sm text-[11px] text-primary font-mono">SEC-RESET-01</span>
            </div>

            <h1 className="font-headline-md text-2xl sm:text-3xl font-bold text-on-surface mb-2">
              Reset Your Password
            </h1>
            <p className="text-on-surface-variant text-sm mb-6">
              Enter your registered work email address to receive password reset instructions.
            </p>

            {errorMsg && (
              <div className="mb-6 p-3 bg-critical/10 border border-critical/40 rounded-lg text-critical text-xs flex items-center gap-2.5">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{errorMsg}</span>
              </div>
            )}

            {dispatched ? (
              <div className="p-6 bg-surface-container-lowest border border-primary/40 rounded-xl flex flex-col gap-3">
                <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span>Reset Instructions Dispatched</span>
                </div>
                <div className="text-xs text-on-surface-variant leading-relaxed">
                  If an account exists for <span className="text-on-surface font-mono font-semibold">{email}</span>, a secure password reset link has been sent. Please check your inbox.
                </div>
                <Link
                  to="/signin"
                  className="mt-2 text-xs text-primary font-semibold hover:underline flex items-center gap-1"
                >
                  <span>Return to Sign In →</span>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleReset} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-code-sm text-xs text-outline uppercase">Registered Work Email</label>
                  <div className="relative flex items-center bg-surface-container-lowest border border-outline-variant/50 rounded-lg px-3 py-2.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
                    <svg className="w-4 h-4 text-outline mr-2 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="engineer@acme.corp"
                      className="w-full bg-transparent font-code-md text-sm text-on-surface focus:outline-none placeholder:text-outline/50"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full py-3 bg-primary hover:bg-primary-container text-on-primary font-headline-sm font-semibold text-sm rounded-lg shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
                      <span>Dispatching Link...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Recovery Link</span>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="mt-8 pt-4 border-t border-outline-variant/30 flex items-center justify-between text-xs text-outline">
              <Link to="/signin" className="hover:text-on-surface transition-colors flex items-center gap-1">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                <span>Back to Sign In</span>
              </Link>
              <span className="text-[11px] text-primary">Standard Security Protocol</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 border-t border-outline-variant/30 text-center text-xs text-outline">
        SupplyGuard • Enterprise Software Supply Chain Security Platform
      </footer>
    </div>
  );
};
