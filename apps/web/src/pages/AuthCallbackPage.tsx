import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, resendVerificationEmail } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState('');
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [resendFeedback, setResendFeedback] = useState<string | null>(null);

  useEffect(() => {
    // If user is already authenticated, redirect straight to dashboard
    if (user) {
      setStatus('success');
      const timer = setTimeout(() => {
        navigate('/app', { replace: true });
      }, 1000);
      return () => clearTimeout(timer);
    }

    let isMounted = true;

    async function handleAuthVerification() {
      try {
        // Parse parameters from both query string (?key=value) and URL hash (#key=value)
        const searchParams = new URLSearchParams(location.search);
        const hashParams = new URLSearchParams(
          location.hash.startsWith('#') ? location.hash.substring(1) : location.hash
        );

        const error = searchParams.get('error') || hashParams.get('error');
        const code = searchParams.get('error_code') || hashParams.get('error_code');
        const desc = searchParams.get('error_description') || hashParams.get('error_description');

        if (error || code || desc) {
          if (!isMounted) return;
          setErrorCode(code);
          if (code === 'otp_expired' || /otp.*expired|invalid.*expired/i.test(desc || '')) {
            setErrorMessage(
              'This email verification link has expired or has already been used. Verification links are single-use and time-limited for security.'
            );
          } else {
            setErrorMessage(
              desc?.replace(/\+/g, ' ') || 'Authentication verification failed. The provided security token is invalid.'
            );
          }
          setStatus('error');
          return;
        }

        // Handle PKCE auth code exchange (?code=...)
        const authCode = searchParams.get('code');
        if (authCode) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode);
          if (exchangeError) {
            if (!isMounted) return;
            setErrorMessage(exchangeError.message || 'Unable to exchange verification code for an authenticated session.');
            setStatus('error');
            return;
          }
          if (data.session) {
            if (!isMounted) return;
            setStatus('success');
            setTimeout(() => {
              navigate('/app', { replace: true });
            }, 1200);
            return;
          }
        }

        // Check if Supabase SDK automatically captured session from hash (#access_token=...)
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          if (!isMounted) return;
          setErrorMessage(sessionError.message);
          setStatus('error');
          return;
        }

        if (sessionData.session) {
          if (!isMounted) return;
          setStatus('success');
          setTimeout(() => {
            navigate('/app', { replace: true });
          }, 1200);
          return;
        }

        // Listen for auth state change if session establishment is still processing
        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
          if (session && (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION')) {
            if (isMounted) {
              setStatus('success');
              navigate('/app', { replace: true });
            }
          }
        });

        // Fallback timeout: If after 3 seconds no session or error was detected
        const fallbackTimer = setTimeout(() => {
          if (isMounted && status === 'verifying') {
            navigate('/signin', {
              replace: true,
              state: { message: 'Verification session completed. Please sign in to continue.' },
            });
          }
        }, 3500);

        return () => {
          listener.subscription.unsubscribe();
          clearTimeout(fallbackTimer);
        };
      } catch (err) {
        if (!isMounted) return;
        setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred during verification.');
        setStatus('error');
      }
    }

    handleAuthVerification();

    return () => {
      isMounted = false;
    };
  }, [location, navigate, user, status]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail || !resendEmail.includes('@')) {
      setResendFeedback('Please enter a valid work email address.');
      return;
    }

    setResendStatus('sending');
    setResendFeedback(null);

    const { error } = await resendVerificationEmail(resendEmail);
    setResendStatus('sent');

    if (error) {
      setResendFeedback(error.message || 'Unable to send verification email. Please try again.');
    } else {
      setResendFeedback('✓ Fresh verification email dispatched. Please check your inbox and click the new link.');
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
            Auth Token Gateway
          </span>
        </Link>

        <div className="flex items-center gap-4 text-xs font-code-sm">
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
            <span>Sign In</span>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl bg-surface-container-low border border-outline-variant/40 rounded-2xl p-8 sm:p-10 shadow-2xl">
          <div className="flex items-center justify-between pb-3 mb-6 border-b border-outline-variant/30">
            <span className="font-code-sm text-[11px] text-outline uppercase tracking-wider">
              AUTHENTICATION PROTOCOL
            </span>
            <span className="font-code-sm text-[11px] text-primary font-mono">SEC-VERIFY-02</span>
          </div>

          {/* State 1: Verifying */}
          {status === 'verifying' && (
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary mb-6 shadow-lg shadow-primary/10 relative">
                <div className="absolute inset-0 rounded-2xl border border-primary animate-ping opacity-25"></div>
                <svg className="w-8 h-8 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10" />
                </svg>
              </div>

              <h1 className="font-headline-md text-2xl font-bold text-on-surface mb-2">
                Verifying Security Credentials
              </h1>
              <p className="text-on-surface-variant text-sm max-w-md mb-6 leading-relaxed">
                Exchanging cryptographic token with the identity provider. Establishing isolated enterprise session...
              </p>

              <div className="w-full bg-surface-container-highest rounded-full h-1.5 overflow-hidden">
                <div className="bg-primary h-full w-2/3 animate-pulse rounded-full"></div>
              </div>
            </div>
          )}

          {/* State 2: Success */}
          {status === 'success' && (
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary flex items-center justify-center text-primary mb-6 shadow-xl shadow-primary/20">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>

              <h1 className="font-headline-md text-2xl font-bold text-on-surface mb-2">
                Identity Verified Successfully
              </h1>
              <p className="text-on-surface-variant text-sm max-w-md mb-6 leading-relaxed">
                Your email address has been verified. Establishing tenant-isolated enclave and redirecting to your workspace...
              </p>

              <Link
                to="/app"
                className="px-6 py-2.5 bg-primary hover:bg-primary-container text-on-primary font-headline-sm font-semibold text-sm rounded-lg shadow-md transition-all inline-flex items-center gap-2"
              >
                <span>Continue to Dashboard</span>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          )}

          {/* State 3: Error */}
          {status === 'error' && (
            <div className="flex flex-col gap-6">
              <div className="flex items-start gap-4 p-4 bg-critical/10 border border-critical/40 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-critical/20 border border-critical/50 flex items-center justify-center text-critical shrink-0">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-headline-sm text-base font-bold text-on-surface mb-1">
                    {errorCode === 'otp_expired' ? 'Verification Link Expired or Invalid' : 'Verification Unsuccessful'}
                  </h2>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {errorMessage}
                  </p>
                </div>
              </div>

              {/* Request New Link Form */}
              <div className="p-5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl">
                <h3 className="font-headline-sm text-sm font-semibold text-on-surface mb-1">
                  Request a Fresh Verification Link
                </h3>
                <p className="text-xs text-on-surface-variant mb-4">
                  Enter your work email to receive a new, single-use verification link immediately:
                </p>

                <form onSubmit={handleResend} className="flex flex-col gap-3">
                  <div className="relative flex items-center bg-surface-container-low border border-outline-variant/50 rounded-lg px-3 py-2 focus-within:border-primary">
                    <svg className="w-4 h-4 text-outline mr-2 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    <input
                      type="email"
                      required
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      placeholder="engineer@acme.corp"
                      className="w-full bg-transparent font-code-md text-sm text-on-surface focus:outline-none placeholder:text-outline/50"
                    />
                  </div>

                  {resendFeedback && (
                    <div className={`text-xs ${resendFeedback.startsWith('✓') ? 'text-primary' : 'text-critical'}`}>
                      {resendFeedback}
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={resendStatus === 'sending'}
                      className="px-4 py-2 bg-primary hover:bg-primary-container text-on-primary font-headline-sm font-semibold text-xs rounded-lg transition-all cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                    >
                      {resendStatus === 'sending' ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
                          <span>Dispatching...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Fresh Link</span>
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </>
                      )}
                    </button>

                    <Link
                      to="/signin"
                      className="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface font-headline-sm font-semibold text-xs rounded-lg transition-colors border border-outline-variant/40"
                    >
                      Return to Sign In
                    </Link>
                  </div>
                </form>
              </div>

              <div className="text-center">
                <Link to="/signup" className="text-xs text-primary hover:underline">
                  Need to create a new account instead? Sign Up →
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-outline-variant/30 text-center text-xs text-outline">
        SupplyGuard • Enterprise Software Supply Chain Security Platform
      </footer>
    </div>
  );
};
