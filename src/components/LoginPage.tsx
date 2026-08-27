import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';
import { AboutRagSignalSection } from './AboutRagSignalSection';
import { Mail, Lock, User, ArrowRight, ShieldCheck, AlertCircle, ExternalLink, Globe } from 'lucide-react';

interface LoginPageProps {
  onBypass?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onBypass }) => {
  const { loginWithEmail, registerWithEmail, loginWithGoogle } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setSubmitting(true);
    try {
      if (isSignUp) {
        await registerWithEmail(email, password, displayName);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let message = 'Failed to authenticate. Please check your details.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        message = 'Invalid email or password.';
      } else if (err.code === 'auth/email-already-in-use') {
        message = 'An account with this email already exists.';
      } else if (err.code === 'auth/weak-password') {
        message = 'Password should be at least 6 characters.';
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        // User closed popup
      } else if (err.code === 'auth/invalid-credential' || err.message?.includes('OAuth2') || err.message?.includes('invalid_client') || err.message?.includes('client secret')) {
        setError('Firebase Google Auth Client Secret is invalid in Firebase Console (Authentication -> Sign-in method -> Google -> Web SDK configuration). Please use Email & Password below or click One-Click Demo Sign-In.');
      } else {
        setError(err.message || 'Failed to sign in with Google. Please use Email & Password.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await loginWithEmail('admin@ragsignal.io', 'RagSignal2026!');
    } catch (err: any) {
      setError(err.message || 'Failed to auto-authenticate.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] flex flex-col justify-center items-center p-4 sm:p-6 font-sans transition-colors duration-200">
      {/* Top Powered / Backlink Badge */}
      <a
        href="https://ragsignal.com"
        target="_blank"
        rel="noopener noreferrer"
        className="mb-4 inline-flex items-center gap-2 px-3.5 py-1.5 bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#D33A2C] dark:hover:border-[#D33A2C] text-[#475569] dark:text-[#CBD5E1] hover:text-[#D33A2C] dark:hover:text-[#D33A2C] rounded-full text-xs font-medium transition-all shadow-xs group"
      >
        <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse shrink-0"></span>
        <span>AI Presence by <strong className="font-bold text-[#111827] dark:text-[#F8FAFC] group-hover:text-[#D33A2C] dark:group-hover:text-[#D33A2C]">RAG Signal</strong></span>
        <ExternalLink className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-[#D33A2C] transition-transform group-hover:translate-x-0.5" />
      </a>

      {/* Container Box */}
      <div className="w-full max-w-md bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] shadow-xl p-8 sm:p-10 rounded-none space-y-6">
        
        {/* Header & Logo */}
        <div className="flex flex-col items-center text-center space-y-3">
          <a
            href="https://ragsignal.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-90 transition-opacity"
            title="Visit ragsignal.com"
          >
            <Logo size="lg" />
          </a>
          <p className="text-xs font-semibold tracking-wider uppercase text-[#64748B] dark:text-[#94A3B8] pt-1">
            Enterprise AI Search Visibility & GEO Analytics
          </p>
        </div>

        {/* Access Restriction Notice */}
        <div className="flex items-center gap-2 bg-[#F1F5F9] dark:bg-[#1E293B]/60 p-3 text-xs text-[#475569] dark:text-[#CBD5E1] border-l-2 border-[#D33A2C]">
          <ShieldCheck className="w-4 h-4 text-[#D33A2C] shrink-0" />
          <span>Restricted workspace. Authenticate to view AI Engine benchmarks.</span>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex flex-col gap-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 p-3 text-xs text-red-700 dark:text-red-300">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={handleQuickDemoLogin}
              disabled={submitting}
              className="mt-1 self-start px-3 py-1 bg-[#D33A2C] text-white font-medium hover:bg-[#B82E21] transition-colors text-xs shadow-xs cursor-pointer"
            >
              Sign In Instantly as Admin →
            </button>
          </div>
        )}

        {/* Social Google Sign In */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white dark:bg-[#1E293B] hover:bg-[#F8FAFC] dark:hover:bg-[#334155] border border-[#CBD5E1] dark:border-[#475569] text-sm font-semibold text-[#1E293B] dark:text-[#F8FAFC] transition-colors cursor-pointer shadow-xs disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Sign in with Google
        </button>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-[#E2E8F0] dark:border-[#334155] w-full" />
          <span className="bg-white dark:bg-[#0F172A] px-3 text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider absolute">
            Or with Email
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#475569] dark:text-[#CBD5E1]">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
                <input
                  type="text"
                  required={isSignUp}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#CBD5E1] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#D33A2C]"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#475569] dark:text-[#CBD5E1]">
              Work Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full pl-9 pr-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#CBD5E1] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#D33A2C]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#475569] dark:text-[#CBD5E1]">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#CBD5E1] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#D33A2C]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 bg-[#D33A2C] hover:bg-[#B82E21] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            <span>{isSignUp ? 'Create Workspace Account' : 'Sign In to Workspace'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Toggle Sign Up / Sign In & Quick Demo Credentials */}
        <div className="flex items-center justify-between pt-2 text-xs">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="text-[#64748B] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-white underline underline-offset-4 cursor-pointer"
          >
            {isSignUp
              ? 'Already registered? Sign In'
              : "Need an account? Register"}
          </button>

          <button
            type="button"
            onClick={() => {
              setEmail('admin@ragsignal.io');
              setPassword('RagSignal2026!');
              setDisplayName('RAG SIGNAL Admin');
              setIsSignUp(false);
              setError(null);
            }}
            className="text-[#D33A2C] font-medium hover:underline cursor-pointer"
          >
            Fill Demo Login
          </button>
        </div>

        {/* Optional Demo Access Bypass for instant preview */}
        {onBypass && (
          <div className="border-t border-[#E2E8F0] dark:border-[#1E293B] pt-4 text-center">
            <button
              type="button"
              onClick={onBypass}
              className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8] hover:text-[#D33A2C] dark:hover:text-[#D33A2C] transition-colors"
            >
              Enter as Guest / Demo Mode →
            </button>
          </div>
        )}
      </div>

      {/* Structured About & Methodology Section (ragsignal.com) */}
      <AboutRagSignalSection />

      <div className="mt-8 flex flex-col items-center gap-2 text-center text-xs text-[#94A3B8] dark:text-[#64748B]">
        <div className="flex items-center gap-2">
          <span>AI Visibility Intelligence powered by</span>
          <a
            href="https://ragsignal.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-[#475569] dark:text-[#CBD5E1] hover:text-[#D33A2C] dark:hover:text-[#D33A2C] underline underline-offset-2 flex items-center gap-1 transition-colors"
          >
            <span>ragsignal.com</span>
            <ExternalLink className="w-3 h-3 inline" />
          </a>
        </div>
        <span>Protected by Firebase Authentication & Role Access Controls</span>
      </div>
    </div>
  );
};
