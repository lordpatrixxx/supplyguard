import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ForgotPasswordPage: React.FC = () => {
  const { resetPassword } = useAuth();
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
      setErrorMsg(error.message || 'Failed to dispatch recovery link.');
    } else {
      setDispatched(true);
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
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Return to Sign In</span>
          </Link>
        </div>
      </header>

      {/* Main Dual-Panel Auth Grid */}
      <div className="flex-1 flex items-center justify-center px-margin-md py-space-xl">
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-space-lg items-center">
          {/* Left Panel: Recovery Protocol Context */}
          <div className="hidden md:flex md:col-span-5 flex-col gap-space-md p-space-lg bg-surface-container-low border border-surface-variant rounded-2xl shadow-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface-container rounded-full text-[11px] font-label-caps text-primary-container border border-primary-container/20 self-start">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
              ACCESS KEY RECOVERY
            </div>

            <h2 className="font-display-lg text-2xl font-bold text-on-surface">
              Cryptographic Key Recovery
            </h2>

            <p className="text-on-surface-variant text-sm leading-relaxed">
              Request a secure, hardware-isolated password recovery token verified via Supabase Authentication and Ed25519 token signatures.
            </p>

            <div className="p-space-md bg-surface-dim border border-surface-variant rounded-xl font-code-sm text-xs flex flex-col gap-2">
              <div className="flex items-center justify-between text-outline border-b border-surface-variant/60 pb-1">
                <span>RECOVERY PROTOCOL</span>
                <span className="text-primary-container font-mono">SEC-RECOV-PROT</span>
              </div>
              <div className="text-outline">
                Validity: <span className="text-on-surface font-mono">900 seconds (15m TTL)</span>
              </div>
              <div className="text-outline">
                Invalidation: <span className="text-primary-container font-mono">100% Deterministic</span>
              </div>
            </div>
          </div>

          {/* Right Panel: Reset Form Card */}
          <div className="md:col-span-7 p-space-lg sm:p-space-xl bg-surface-container-low border border-surface-variant rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between pb-space-sm mb-space-md border-b border-surface-variant">
              <span className="font-label-caps text-[11px] text-outline uppercase tracking-wider">
                PS14 • CREDENTIAL RECOVERY
              </span>
              <span className="font-code-sm text-[11px] text-primary-container font-mono">SEC-RESET-01</span>
            </div>

            <h1 className="font-display-lg text-2xl sm:text-3xl font-bold text-on-surface mb-1">
              Reset Your Access Key
            </h1>
            <p className="text-on-surface-variant text-sm mb-space-lg">
              Enter your registered developer email address to receive a secure recovery link.
            </p>

            {errorMsg && (
              <div className="mb-space-md p-space-sm bg-risk-critical/10 border border-risk-critical/40 rounded-lg text-risk-critical text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {dispatched ? (
              <div className="p-space-md bg-surface-dim border border-primary-container/40 rounded-xl flex flex-col gap-3">
                <div className="flex items-center gap-2 text-primary-container font-bold text-sm">
                  <span className="material-symbols-outlined text-[20px]">check_circle</span>
                  <span>Recovery Token Dispatched</span>
                </div>
                <div className="text-xs text-on-surface-variant leading-relaxed">
                  A cryptographic password reset link was sent to <span className="text-on-surface font-mono font-bold">{email}</span>. Please check your inbox and spam folder.
                </div>
                <Link
                  to="/signin"
                  className="mt-2 text-xs text-primary-container font-semibold hover:underline flex items-center gap-1"
                >
                  <span>Return to Sign In →</span>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleReset} className="flex flex-col gap-space-md">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-caps text-xs text-outline uppercase">Registered Developer Email</label>
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

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-space-xs w-full py-3 bg-primary-container hover:bg-primary text-on-primary font-headline-sm font-bold text-sm rounded-lg shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
                      <span>Dispatching Token...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Recovery Link</span>
                      <span className="material-symbols-outlined text-[18px]">send</span>
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="mt-space-lg pt-space-md border-t border-surface-variant flex items-center justify-between text-xs text-outline">
              <Link to="/signin" className="hover:text-on-surface transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>Back to Sign In</span>
              </Link>
              <span className="text-[11px] text-primary-container">PS14 Security Protocol</span>
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
