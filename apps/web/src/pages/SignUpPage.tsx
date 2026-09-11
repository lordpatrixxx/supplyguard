import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Compute simple password strength (0-100)
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
      setErrorMsg('Please agree to the PS14 Supply Chain Security terms to proceed.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const { error } = await signUp(email, password, fullName);
    setLoading(false);

    if (error) {
      setErrorMsg(error.message || 'Registration failed. Please check your credentials.');
    } else {
      setSuccessMsg('Account created successfully! Redirecting to your workspace...');
      setTimeout(() => {
        navigate('/app');
      }, 1200);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col justify-between font-body-md selection:bg-primary-container selection:text-on-primary">
      {/* Top Header */}
      <header className="h-16 bg-surface-container-lowest border-b border-surface-variant flex items-center justify-between px-margin-md lg:px-margin-lg">
        <Link to="/" className="flex items-center gap-space-sm group">
          <div className="w-8 h-8 rounded-lg bg-surface-container border border-primary-container/40 flex items-center justify-center text-primary-container group-hover:border-primary-container transition-colors shadow-sm">
            <span className="material-symbols-outlined text-[20px]">shield</span>
          </div>
          <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight">
            Supply<span className="text-primary-container font-bold">Guard</span>
          </span>
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-code-sm uppercase tracking-wider bg-surface-container-high border border-surface-variant text-outline">
            PS14 • Kurukshetra 2.0
          </span>
        </Link>

        <div className="flex items-center gap-space-md text-xs font-code-sm">
          <Link to="/signin" className="text-outline hover:text-on-surface transition-colors flex items-center gap-1">
            <span>Already registered? Sign In</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
      </header>

      {/* Main Dual-Panel Auth Grid */}
      <div className="flex-1 flex items-center justify-center px-margin-md py-space-xl">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-center">
          {/* Left Panel: Cryptographic Context & Enrollment Guarantees */}
          <div className="hidden lg:flex lg:col-span-5 flex-col gap-space-md p-space-lg bg-surface-container-low border border-surface-variant rounded-2xl shadow-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface-container rounded-full text-[11px] font-label-caps text-primary-container border border-primary-container/20 self-start">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
              SECURE ENCLAVE ENROLLMENT
            </div>

            <h2 className="font-display-lg text-2xl font-bold text-on-surface">
              Developer & SecOps Provisioning
            </h2>

            <p className="text-on-surface-variant text-sm leading-relaxed">
              Create an isolated organization workspace to map software dependencies, verify build provenance, and audit repository CVE exposure.
            </p>

            <div className="space-y-3 pt-2 text-xs text-on-surface-variant">
              <div className="flex items-start gap-2.5 p-space-sm bg-surface-dim border border-surface-variant rounded-xl">
                <span className="material-symbols-outlined text-primary-container text-[18px] shrink-0 mt-0.5">lock</span>
                <div>
                  <div className="font-bold text-on-surface">Row-Level Security Active</div>
                  <div className="text-outline text-[11px] mt-0.5">Your scan records and findings are isolated to your authenticated user account via Postgres RLS.</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-space-sm bg-surface-dim border border-surface-variant rounded-xl">
                <span className="material-symbols-outlined text-primary-container text-[18px] shrink-0 mt-0.5">hub</span>
                <div>
                  <div className="font-bold text-on-surface">Multi-Version Graphing</div>
                  <div className="text-outline text-[11px] mt-0.5">Resolve co-existing versions of identical packages with distinct topology nodes and depth metrics.</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-space-sm bg-surface-dim border border-surface-variant rounded-xl">
                <span className="material-symbols-outlined text-primary-container text-[18px] shrink-0 mt-0.5">download</span>
                <div>
                  <div className="font-bold text-on-surface">CycloneDX SBOM Export</div>
                  <div className="text-outline text-[11px] mt-0.5">Export standardized CycloneDX v1.5 JSON bills of materials for regulatory audit compliance.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Sign Up Form Card */}
          <div className="lg:col-span-7 p-space-lg sm:p-space-xl bg-surface-container-low border border-surface-variant rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between pb-space-sm mb-space-md border-b border-surface-variant">
              <span className="font-label-caps text-[11px] text-outline uppercase tracking-wider">
                PS14 • DEVELOPER REGISTRATION
              </span>
              <span className="font-code-sm text-[11px] text-primary-container font-mono">SEC-REG-01</span>
            </div>

            <h1 className="font-display-lg text-2xl sm:text-3xl font-bold text-on-surface mb-1">
              Create Your Account
            </h1>
            <p className="text-on-surface-variant text-sm mb-space-lg">
              Enroll your credentials to begin scanning repositories with SupplyGuard.
            </p>

            {errorMsg && (
              <div className="mb-space-md p-space-sm bg-risk-critical/10 border border-risk-critical/40 rounded-lg text-risk-critical text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-space-md p-space-sm bg-primary-container/10 border border-primary-container/40 rounded-lg text-primary-container text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-space-md">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-caps text-xs text-outline uppercase">Full Name / Developer Handle</label>
                <div className="relative flex items-center bg-surface-dim border border-surface-variant rounded-lg px-space-sm py-2 focus-within:border-primary-container focus-within:ring-1 focus-within:ring-primary-container transition-all">
                  <span className="material-symbols-outlined text-outline text-[18px] mr-2">person</span>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alex Chen"
                    className="w-full bg-transparent font-code-md text-sm text-on-surface focus:outline-none placeholder:text-outline/60"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-caps text-xs text-outline uppercase">Developer Email</label>
                <div className="relative flex items-center bg-surface-dim border border-surface-variant rounded-lg px-space-sm py-2 focus-within:border-primary-container focus-within:ring-1 focus-within:ring-primary-container transition-all">
                  <span className="material-symbols-outlined text-outline text-[18px] mr-2">mail</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="developer@acme.corp"
                    className="w-full bg-transparent font-code-md text-sm text-on-surface focus:outline-none placeholder:text-outline/60"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-label-caps text-xs text-outline uppercase">Master Access Password</label>
                  {password && (
                    <span className={`text-[11px] font-code-sm ${strength >= 70 ? 'text-primary-container' : 'text-risk-medium'}`}>
                      Strength: {strength >= 70 ? 'Strong' : 'Moderate'} ({strength}%)
                    </span>
                  )}
                </div>
                <div className="relative flex items-center bg-surface-dim border border-surface-variant rounded-lg px-space-sm py-2 focus-within:border-primary-container focus-within:ring-1 focus-within:ring-primary-container transition-all">
                  <span className="material-symbols-outlined text-outline text-[18px] mr-2">lock</span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full bg-transparent font-code-md text-sm text-on-surface focus:outline-none placeholder:text-outline/60"
                  />
                </div>
                {/* Strength Meter Bar */}
                {password && (
                  <div className="w-full h-1 bg-surface-variant rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full transition-all duration-300 ${strength >= 70 ? 'bg-primary-container' : 'bg-risk-medium'}`}
                      style={{ width: `${strength}%` }}
                    ></div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-label-caps text-xs text-outline uppercase">Confirm Password</label>
                  {confirmPassword && (
                    <span className={`text-[11px] font-code-sm ${passwordsMatch ? 'text-primary-container' : 'text-risk-critical'}`}>
                      {passwordsMatch ? 'Passwords match ✓' : 'Passwords do not match ✗'}
                    </span>
                  )}
                </div>
                <div className="relative flex items-center bg-surface-dim border border-surface-variant rounded-lg px-space-sm py-2 focus-within:border-primary-container focus-within:ring-1 focus-within:ring-primary-container transition-all">
                  <span className="material-symbols-outlined text-outline text-[18px] mr-2">verified</span>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full bg-transparent font-code-md text-sm text-on-surface focus:outline-none placeholder:text-outline/60"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <input
                  type="checkbox"
                  id="agree"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="rounded bg-surface-dim border-surface-variant text-primary-container focus:ring-0 cursor-pointer"
                />
                <label htmlFor="agree" className="text-xs text-outline cursor-pointer">
                  I agree to the PS14 Supply Chain Security Auditing Terms & Policies.
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-space-xs w-full py-3 bg-primary-container hover:bg-primary text-on-primary font-headline-sm font-bold text-sm rounded-lg shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
                    <span>Creating Workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-space-lg pt-space-md border-t border-surface-variant flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-outline">
              <div>
                Already registered?{' '}
                <Link to="/signin" className="text-primary-container font-semibold hover:underline">
                  Sign In →
                </Link>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-primary-container">
                <span className="material-symbols-outlined text-[14px]">shield</span>
                <span>Supabase Auth Guarded</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-space-md border-t border-surface-variant text-center text-xs text-outline">
        SupplyGuard • PS14 Software Supply Chain Security • Kurukshetra 2.0 National Hackathon
      </footer>
    </div>
  );
};
