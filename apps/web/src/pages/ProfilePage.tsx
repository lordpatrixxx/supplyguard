import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import {
  User, Mail, Shield, Sun, Moon, Save, LogOut, Lock,
  CheckCircle, AlertCircle, Loader2, Calendar, Clock, Eye, EyeOff,
  KeyRound
} from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  message: string;
  type: ToastType;
  id: number;
}

export function ProfilePage() {
  const { user, signOut, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Password change
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || '');
    }
  }, [user]);

  const addToast = (message: string, type: ToastType) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { message, type, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      addToast('Full name cannot be empty.', 'error');
      return;
    }
    setIsSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName.trim() },
    });
    if (error) {
      setIsSaving(false);
      addToast(error.message || 'Failed to update profile.', 'error');
    } else {
      await refreshUser();
      setIsSaving(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
      addToast('Profile updated successfully.', 'success');
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 8) {
      addToast('Password must be at least 8 characters.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast('Passwords do not match.', 'error');
      return;
    }
    setIsChangingPassword(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setIsChangingPassword(false);
    if (error) {
      addToast(error.message || 'Failed to update password.', 'error');
    } else {
      addToast('Password updated successfully.', 'success');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/signin');
  };

  const userInitial = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.charAt(0).toUpperCase()
    : user?.email
      ? user.email.charAt(0).toUpperCase()
      : 'U';

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const passwordStrength = (pwd: string): { label: string; color: string; percent: number } => {
    if (!pwd) return { label: '', color: '', percent: 0 };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;

    if (score <= 1) return { label: 'Weak', color: 'bg-critical', percent: 20 };
    if (score <= 2) return { label: 'Fair', color: 'bg-warning', percent: 40 };
    if (score <= 3) return { label: 'Good', color: 'bg-tertiary', percent: 60 };
    if (score <= 4) return { label: 'Strong', color: 'bg-primary', percent: 80 };
    return { label: 'Excellent', color: 'bg-safe', percent: 100 };
  };

  const strength = passwordStrength(newPassword);

  return (
    <div className="w-full min-h-screen animate-fade-in">
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="font-headline-md text-2xl font-bold text-on-surface tracking-tight">
            Profile & Settings
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Manage your identity, preferences, and security settings.
          </p>
        </div>

        {/* ── Identity Card ── */}
        <section className="mb-6 p-6 bg-surface-container-low rounded-xl border border-outline-variant/40 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/15 border-2 border-primary/50 flex items-center justify-center text-primary font-headline-md text-2xl font-bold shrink-0 select-none transition-transform hover:scale-105">
              {userInitial}
            </div>
            <div className="min-w-0">
              <h2 className="font-headline-sm text-lg font-bold text-on-surface truncate">
                {displayName}
              </h2>
              <p className="font-code-sm text-xs text-on-surface-variant truncate">
                {user?.email || '—'}
              </p>
            </div>
          </div>

          <div className="h-[1px] bg-outline-variant/30 mb-6" />

          {/* Personal Information */}
          <h3 className="font-headline-sm text-sm font-semibold text-on-surface mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Personal Information
          </h3>

          <div className="grid gap-4">
            <div>
              <label className="font-code-sm text-xs text-outline uppercase tracking-wider block mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full h-10 bg-surface-container-lowest border border-outline-variant/50 rounded-lg px-3 text-on-surface font-body-md text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-outline/50"
              />
            </div>

            <div>
              <label className="font-code-sm text-xs text-outline uppercase tracking-wider block mb-1.5">
                Email Address
              </label>
              <div className="flex items-center gap-2 h-10 bg-surface-container border border-outline-variant/30 rounded-lg px-3">
                <Mail className="w-4 h-4 text-outline shrink-0" />
                <span className="text-on-surface-variant font-code-sm text-sm truncate">
                  {user?.email || '—'}
                </span>
                <span className="ml-auto text-[10px] font-code-sm text-outline uppercase tracking-wider bg-surface-container-high px-2 py-0.5 rounded">
                  Read-only
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`flex items-center gap-2 px-4 py-2 font-headline-sm text-xs rounded-lg transition-all shadow-sm font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                justSaved
                  ? 'bg-safe text-on-primary'
                  : 'bg-primary hover:bg-primary-container text-on-primary'
              }`}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : justSaved ? (
                <CheckCircle className="w-4 h-4 animate-pulse" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isSaving ? 'Saving...' : justSaved ? 'Saved ✓' : 'Save Changes'}</span>
            </button>
          </div>
        </section>

        {/* ── Appearance ── */}
        <section className="mb-6 p-6 bg-surface-container-low rounded-xl border border-outline-variant/40 shadow-sm">
          <h3 className="font-headline-sm text-sm font-semibold text-on-surface mb-4 flex items-center gap-2">
            {theme === 'dark' ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-primary" />}
            Appearance
          </h3>
          <p className="text-on-surface-variant text-xs mb-4">
            Choose your preferred theme. Your preference is saved automatically.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setTheme('dark')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-body-md transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'bg-primary/10 border-primary/50 text-primary font-semibold'
                  : 'bg-surface-container border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <Moon className="w-4 h-4" />
              Dark
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-body-md transition-all cursor-pointer ${
                theme === 'light'
                  ? 'bg-primary/10 border-primary/50 text-primary font-semibold'
                  : 'bg-surface-container border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <Sun className="w-4 h-4" />
              Light
            </button>
          </div>
        </section>

        {/* ── Security ── */}
        <section className="mb-6 p-6 bg-surface-container-low rounded-xl border border-outline-variant/40 shadow-sm">
          <h3 className="font-headline-sm text-sm font-semibold text-on-surface mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Security
          </h3>

          {!showPasswordSection ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPasswordSection(true)}
                className="flex items-center gap-2 px-4 py-2 bg-surface-container border border-outline-variant/40 text-on-surface font-headline-sm text-xs rounded-lg transition-all hover:bg-surface-container-high cursor-pointer font-semibold"
              >
                <Lock className="w-4 h-4" />
                Change Password
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 bg-surface-container border border-critical/30 text-critical font-headline-sm text-xs rounded-lg transition-all hover:bg-critical/10 cursor-pointer font-semibold"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="font-code-sm text-xs text-outline uppercase tracking-wider block mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full h-10 bg-surface-container-lowest border border-outline-variant/50 rounded-lg pl-9 pr-10 text-on-surface font-body-md text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-outline/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors bg-transparent border-none cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPassword && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-code-sm text-[11px] text-outline">Strength</span>
                      <span className="font-code-sm text-[11px] text-on-surface-variant">{strength.label}</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${strength.color}`}
                        style={{ width: `${strength.percent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="font-code-sm text-xs text-outline uppercase tracking-wider block mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full h-10 bg-surface-container-lowest border border-outline-variant/50 rounded-lg pl-9 pr-10 text-on-surface font-body-md text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-outline/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors bg-transparent border-none cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-critical font-code-sm text-[11px] mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Passwords do not match
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handlePasswordChange}
                  disabled={isChangingPassword || !newPassword || !confirmPassword}
                  className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-xs rounded-lg transition-all shadow-sm font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isChangingPassword ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  <span>{isChangingPassword ? 'Updating...' : 'Update Password'}</span>
                </button>
                <button
                  onClick={() => {
                    setShowPasswordSection(false);
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="px-4 py-2 text-on-surface-variant font-headline-sm text-xs rounded-lg transition-all hover:bg-surface-container cursor-pointer bg-transparent border-none font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ── Account Information ── */}
        <section className="mb-6 p-6 bg-surface-container-low rounded-xl border border-outline-variant/40 shadow-sm">
          <h3 className="font-headline-sm text-sm font-semibold text-on-surface mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Account Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-outline mt-0.5 shrink-0" />
              <div>
                <p className="font-code-sm text-[10px] text-outline uppercase tracking-wider">Account Created</p>
                <p className="text-on-surface text-sm font-body-md">{formatDate(user?.created_at)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-outline mt-0.5 shrink-0" />
              <div>
                <p className="font-code-sm text-[10px] text-outline uppercase tracking-wider">Last Sign In</p>
                <p className="text-on-surface text-sm font-body-md">{formatDate(user?.last_sign_in_at)}</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── Toast Notifications ── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-lg border animate-slide-in font-body-md text-sm max-w-sm ${
              toast.type === 'success'
                ? 'bg-safe/10 border-safe/30 text-safe'
                : toast.type === 'error'
                  ? 'bg-critical/10 border-critical/30 text-critical'
                  : 'bg-primary/10 border-primary/30 text-primary'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : null}
            <span className="text-sm">{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
