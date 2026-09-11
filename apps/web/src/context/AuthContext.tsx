import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface SignUpResult {
  user: User | null;
  session: Session | null;
  needsEmailConfirmation: boolean;
  alreadyRegistered?: boolean;
  error: Error | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<SignUpResult>;
  resendVerificationEmail: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const getAppUrl = (): string => {
  const envUrl = import.meta.env.VITE_APP_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }
  return 'https://supplyguard-rho.vercel.app';
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial active Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSession(session);
        setUser(session.user);
      }
      setLoading(false);
    });

    // Listen for auth state changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (!error && data.session) {
      setSession(data.session);
      setUser(data.user);
    }
    setLoading(false);
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string): Promise<SignUpResult> => {
    setLoading(true);
    const callbackUrl = `${getAppUrl()}/auth/callback`;
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: callbackUrl,
      },
    });

    if (error) {
      setLoading(false);
      return {
        user: null,
        session: null,
        needsEmailConfirmation: false,
        error: error as Error,
      };
    }

    if (data.session) {
      setSession(data.session);
      setUser(data.user);
      setLoading(false);
      return {
        user: data.user,
        session: data.session,
        needsEmailConfirmation: false,
        alreadyRegistered: false,
        error: null,
      };
    }

    // Check if user already exists (Supabase returns empty identities array for existing users)
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setLoading(false);
      return {
        user: data.user,
        session: null,
        needsEmailConfirmation: false,
        alreadyRegistered: true,
        error: new Error('An account with this email address already exists. Please sign in with your password.'),
      };
    }

    // User created successfully, but email verification is required before login
    setLoading(false);
    return {
      user: data.user,
      session: null,
      needsEmailConfirmation: true,
      alreadyRegistered: false,
      error: null,
    };
  };

  const resendVerificationEmail = async (email: string): Promise<{ error: Error | null }> => {
    const callbackUrl = `${getAppUrl()}/auth/callback`;
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: {
        emailRedirectTo: callbackUrl,
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setLoading(false);
  };

  const resetPassword = async (email: string) => {
    const callbackUrl = `${getAppUrl()}/auth/callback`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: callbackUrl,
    });
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        resendVerificationEmail,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
