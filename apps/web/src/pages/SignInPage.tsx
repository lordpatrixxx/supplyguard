import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const SignInPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, loginAsDemo } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const returnTo = (location.state as { returnTo?: string })?.returnTo || '/app';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email address and access password.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      setErrorMsg(error.message || 'Invalid credentials or expired session key.');
    } else {
      navigate(returnTo);
    }
  };

  const handleDemoAutofill = () => {
    loginAsDemo();
    navigate(returnTo);
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
          <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface-container border border-primary-container/30 rounded-lg text-primary-container">
            <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
            SecOps Core: Ready
          </span>
          <Link to="/" className="text-outline hover:text-on-surface transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Home</span>
          </Link>
        </div>
      </header>

      {/* Main Dual-Panel Auth Grid */}
      <div className="flex-1 flex items-center justify-center px-margin-md py-space-xl">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-center">
          {/* Left Panel: Cryptographic Context & Reassurance */}
          <div className="hidden lg:flex lg:col-span-5 flex-col gap-space-md p-space-lg bg-surface-container-low border border-surface-variant rounded-2xl shadow-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface-container rounded-full text-[11px] font-label-caps text-primary-container border border-primary-container/20 self-start">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
              CRYPTOGRAPHIC IDENTITY
            </div>

            <h2 className="font-display-lg text-2xl font-bold text-on-surface">
              Secure SecOps Authentication
            </h2>

            <p className="text-on-surface-variant text-sm leading-relaxed">
              Access your software supply chain workspace to audit repositories, inspect dependency fan-out, and track vulnerability remediation over time.
            </p>

            <div className="p-space-md bg-surface-dim border border-surface-variant rounded-xl font-code-sm text-xs flex flex-col gap-2">
              <div className="flex items-center justify-between text-outline border-b border-surface-variant/60 pb-1">
                <span>AUTH DAEMON STATUS</span>
                <span className="text-primary-container font-mono">ONLINE</span>
              </div>
              <div className="text-outline">
                Enclave: <span className="text-on-surface font-mono">in-blr-sec01</span>
              </div>
              <div className="text-outline">
                Identity Proof: <span className="text-primary-container font-mono">Ed25519 Verified</span>
              </div>
              <div className="text-outline">
                Access Mode: <span className="text-brand-accent font-mono">Row-Level Security Active</span>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-surface-variant/60 text-xs text-on-surface-variant">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-primary-container">verified_user</span>
                <span>Zero-knowledge persistent code storage</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-primary-container">enhanced_encryption</span>
                <span>Isolated tenant scanning enclaves</span>
              </div>
            </div>
          </div>

          {/* Right Panel: Sign In Form Card */}
          <div className="lg:col-span-7 p-space-lg sm:p-space-xl bg-surface-container-low border border-surface-variant rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between pb-space-sm mb-space-md border-b border-surface-variant">
              <span className="font-label-caps text-[11px] text-outline uppercase tracking-wider">
                PS14 • KURUKSHETRA 2.0 AUTHENTICATION
              </span>
              <span className="font-code-sm text-[11px] text-primary-container font-mono">SEC-AUTH-01</span>
            </div>

            <h1 className="font-display-lg text-2xl sm:text-3xl font-bold text-on-surface mb-1">
              Sign In to SupplyGuard
            </h1>
            <p className="text-on-surface-variant text-sm mb-space-lg">
              Enter your credentials to access your private repository scans and findings.
            </p>

            {/* Quick Demo Autofill Banner for Hackathon Judges */}
            <div className="mb-space-md p-space-sm bg-surface-container border border-primary-container/30 rounded-xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="material-symbols-outlined text-primary-container text-[18px]">verified</span>
                <div>
                  <span className="text-on-surface font-semibold">Hackathon Judge Fast-Pass:</span>{' '}
                  <span className="text-outline font-mono">judge@supplyguard.sec</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDemoAutofill}
                className="px-2.5 py-1 bg-primary-container/20 hover:bg-primary-container text-primary-container hover:text-on-primary text-xs font-bold rounded transition-colors shrink-0"
              >
                Instant Access →
              </button>
            </div>

            {errorMsg && (
              <div className="mb-space-md p-space-sm bg-risk-critical/10 border border-risk-critical/40 rounded-lg text-risk-critical text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-space-md">
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
                  <label className="font-label-caps text-xs text-outline uppercase">Access Password</label>
                  <Link to="/forgot-password" className="text-xs text-primary-container hover:underline">
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative flex items-center bg-surface-dim border border-surface-variant rounded-lg px-space-sm py-2 focus-within:border-primary-container focus-within:ring-1 focus-within:ring-primary-container transition-all">
                  <span className="material-symbols-outlined text-outline text-[18px] mr-2">lock</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-transparent font-code-md text-sm text-on-surface focus:outline-none placeholder:text-outline/60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-outline hover:text-on-surface text-[18px] ml-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-space-xs w-full py-3 bg-primary-container hover:bg-primary text-on-primary font-headline-sm font-bold text-sm rounded-lg shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-space-lg pt-space-md border-t border-surface-variant flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-outline">
              <div>
                Don't have an account?{' '}
                <Link to="/signup" className="text-primary-container font-semibold hover:underline">
                  Sign Up →
                </Link>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-primary-container">
                <span className="material-symbols-outlined text-[14px]">shield</span>
                <span>Supabase RLS Protected</span>
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
