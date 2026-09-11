import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Compute password strength (0-100)
  const computePasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score += 30;
    if (pass.length >= 12) score += 20;
    if (/[A-Z]/.test(pass)) score += 20;
    if (/[0-9]/.test(pass)) score += 15;
    if (/[^A-Za-z0-9]/.test(pass)) score += 15;
    return Math.min(score, 100);
  };

  const strength = computePasswordStrength(password);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password || !confirmPassword) {
      setErrorMsg('All fields are required.');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (!agreedTerms) {
      setErrorMsg('Please agree to the SupplyGuard Security Terms & Policies to proceed.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const { error } = await signUp(email, password, fullName);
    setLoading(false);

    if (error) {
      setErrorMsg(error.message || 'Registration failed. Please verify your email and credentials.');
    } else {
      setSuccessMsg('Account created successfully! Check your email if verification is required, or proceeding to workspace...');
      setTimeout(() => {
        navigate('/app');
      }, 1200);
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
            <span>Already registered? Sign In</span>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </header>

      {/* Main Dual-Panel Auth Grid */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Panel: Security Capabilities */}
          <div className="hidden lg:flex lg:col-span-5 flex-col gap-4 p-8 bg-surface-container-low border border-outline-variant/40 rounded-2xl shadow-xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-surface-container rounded-full text-[11px] font-code-sm text-primary border border-primary/20 self-start">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
              SECURE ENCLAVE ONBOARDING
            </div>

            <h2 className="font-headline-md text-2xl font-bold text-on-surface">
              Enterprise Supply Chain Defense
            </h2>

            <p className="text-on-surface-variant text-sm leading-relaxed">
              Create an isolated organization workspace to map software dependencies, verify build provenance signals, and audit repository vulnerability exposure.
            </p>

            <div className="space-y-3 pt-2 text-xs text-on-surface-variant">
              <div className="flex items-start gap-3 p-3 bg-surface-container-lowest border border-outline-variant/30 rounded-xl">
                <svg className="w-5 h-5 text-primary shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <div>
                  <div className="font-semibold text-on-surface">Tenant-Isolated Architecture</div>
                  <div className="text-outline text-[11px] mt-0.5">Your scan records and findings are cryptographically isolated to your authenticated account.</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-surface-container-lowest border border-outline-variant/30 rounded-xl">
                <svg className="w-5 h-5 text-primary shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                <div>
                  <div className="font-semibold text-on-surface">Multi-Version Graphing</div>
                  <div className="text-outline text-[11px] mt-0.5">Resolve co-existing versions of identical packages with distinct topology nodes and depth metrics.</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-surface-container-lowest border border-outline-variant/30 rounded-xl">
                <svg className="w-5 h-5 text-primary shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <div>
                  <div className="font-semibold text-on-surface">CycloneDX v1.5 SBOM Export</div>
                  <div className="text-outline text-[11px] mt-0.5">Export standardized CycloneDX v1.5 JSON bills of materials for regulatory audit compliance.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Sign Up Form Card */}
          <div className="lg:col-span-7 p-8 sm:p-10 bg-surface-container-low border border-outline-variant/40 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-6 border-b border-outline-variant/30">
              <span className="font-code-sm text-[11px] text-outline uppercase tracking-wider">
                SUPPLYGUARD REGISTRATION
              </span>
              <span className="font-code-sm text-[11px] text-primary font-mono">SEC-REG-01</span>
            </div>

            <h1 className="font-headline-md text-2xl sm:text-3xl font-bold text-on-surface mb-2">
              Create Your Account
            </h1>
            <p className="text-on-surface-variant text-sm mb-6">
              Enroll your credentials to begin scanning repositories with SupplyGuard.
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

            {successMsg && (
              <div className="mb-6 p-3 bg-primary/10 border border-primary/40 rounded-lg text-primary text-xs flex items-center gap-2.5">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-code-sm text-xs text-outline uppercase">Full Name / Engineer Handle</label>
                <div className="relative flex items-center bg-surface-container-lowest border border-outline-variant/50 rounded-lg px-3 py-2.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
                  <svg className="w-4 h-4 text-outline mr-2 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alex Chen"
                    className="w-full bg-transparent font-code-md text-sm text-on-surface focus:outline-none placeholder:text-outline/50"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-code-sm text-xs text-outline uppercase">Work Email</label>
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

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-code-sm text-xs text-outline uppercase">Password</label>
                  {password && (
                    <span className={`text-[11px] font-code-sm ${strength >= 70 ? 'text-primary' : 'text-warning'}`}>
                      Strength: {strength >= 70 ? 'Strong' : 'Moderate'} ({strength}%)
                    </span>
                  )}
                </div>
                <div className="relative flex items-center bg-surface-container-lowest border border-outline-variant/50 rounded-lg px-3 py-2.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
                  <svg className="w-4 h-4 text-outline mr-2 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full bg-transparent font-code-md text-sm text-on-surface focus:outline-none placeholder:text-outline/50"
                  />
                </div>
                {/* Strength Meter Bar */}
                {password && (
                  <div className="w-full h-1 bg-surface-variant rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full transition-all duration-300 ${strength >= 70 ? 'bg-primary' : 'bg-warning'}`}
                      style={{ width: `${strength}%` }}
                    ></div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-code-sm text-xs text-outline uppercase">Confirm Password</label>
                  {confirmPassword && (
                    <span className={`text-[11px] font-code-sm ${passwordsMatch ? 'text-primary' : 'text-critical'}`}>
                      {passwordsMatch ? 'Passwords match ✓' : 'Passwords do not match ✗'}
                    </span>
                  )}
                </div>
                <div className="relative flex items-center bg-surface-container-lowest border border-outline-variant/50 rounded-lg px-3 py-2.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
                  <svg className="w-4 h-4 text-outline mr-2 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm access password"
                    className="w-full bg-transparent font-code-md text-sm text-on-surface focus:outline-none placeholder:text-outline/50"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <input
                  type="checkbox"
                  id="agree"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="rounded bg-surface-container-lowest border-outline-variant text-primary focus:ring-0 cursor-pointer"
                />
                <label htmlFor="agree" className="text-xs text-outline cursor-pointer">
                  I agree to the SupplyGuard Service Terms & Security Auditing Policies.
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full py-3 bg-primary hover:bg-primary-container text-on-primary font-headline-sm font-semibold text-sm rounded-lg shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-4 border-t border-outline-variant/30 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-outline">
              <div>
                Already registered?{' '}
                <Link to="/signin" className="text-primary font-semibold hover:underline">
                  Sign In →
                </Link>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-primary">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
                </svg>
                <span>Enterprise Cryptographic Security</span>
              </div>
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
