import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isDemo: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  loginAsDemo: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    // Check local cached demo session first
    const cachedDemo = localStorage.getItem('supplyguard_demo_user');
    if (cachedDemo) {
      try {
        const parsed = JSON.parse(cachedDemo);
        setUser(parsed);
        setIsDemo(true);
      } catch {
        localStorage.removeItem('supplyguard_demo_user');
      }
    }

    // Check initial Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSession(session);
        setUser(session.user);
        setIsDemo(false);
        localStorage.removeItem('supplyguard_demo_user');
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setSession(session);
        setUser(session.user);
        setIsDemo(false);
        localStorage.removeItem('supplyguard_demo_user');
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.session) {
      setSession(data.session);
      setUser(data.user);
      setIsDemo(false);
      localStorage.removeItem('supplyguard_demo_user');
    }
    setLoading(false);
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    if (!error && data.session) {
      setSession(data.session);
      setUser(data.user);
      setIsDemo(false);
      localStorage.removeItem('supplyguard_demo_user');
    }
    setLoading(false);
    return { error: error as Error | null };
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    localStorage.removeItem('supplyguard_demo_user');
    setUser(null);
    setSession(null);
    setIsDemo(false);
    setLoading(false);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/signin`,
    });
    return { error: error as Error | null };
  };

  const loginAsDemo = () => {
    setIsDemo(true);
    const mockUser: User = {
      id: 'demo-judge-secops-001',
      app_metadata: {},
      user_metadata: { full_name: 'SecOps Judge (Demo)' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email: 'judge@supplyguard.sec',
      phone: '',
      role: 'authenticated',
      updated_at: new Date().toISOString(),
    };
    setUser(mockUser);
    localStorage.setItem('supplyguard_demo_user', JSON.stringify(mockUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isDemo,
        signIn,
        signUp,
        signOut,
        resetPassword,
        loginAsDemo,
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
