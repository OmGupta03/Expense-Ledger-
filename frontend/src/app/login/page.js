'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Wallet, ArrowRight, ArrowLeft, LogOut, UserCheck } from 'lucide-react';

export default function LoginPage() {
  const { user, signIn, signInWithGoogle, signOut, loading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('logout') === 'true' || params.get('switch') === 'true') {
        signOut();
      }
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await signIn(email, password);
      router.push('/dashboard');
    } catch (err) {
      console.error('Sign in error:', err);
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Google sign in error:', err);
      setError(err.message || 'Google authentication failed');
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07100b] flex flex-col items-center justify-center text-slate-300">
        <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-3 text-xs font-semibold text-emerald-400">Loading session...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#07100b] text-white min-h-screen flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden select-none">
      
      {/* Background Ambient Glow & Tech Grid Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/50 via-[#07100b] to-[#07100b] pointer-events-none" />
      <div 
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#10b981 1px, transparent 1px), linear-gradient(90deg, #10b981 1px, transparent 1px)`,
          backgroundSize: '48px 48px'
        }}
      />

      {/* Top Header Navigation Back Link */}
      <div className="absolute top-6 left-6 z-20">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-emerald-400 transition-colors no-underline px-3.5 py-2 rounded-full bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-lg"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Central Glassmorphic Login Card */}
      <div className="w-full max-w-md stitch-glass-card rounded-3xl p-8 md:p-10 shadow-2xl border border-emerald-900/60 bg-[#0b1610]/95 backdrop-blur-xl relative z-10 space-y-6 text-left">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-500/20 mb-1">
            <Wallet className="h-6 w-6 text-slate-950" />
          </div>
          <div>
            <h1 className="font-extrabold text-2xl tracking-tight text-white">SmartCash</h1>
            <p className="text-[11px] font-extrabold text-emerald-400 mt-0.5">Student Group Finances</p>
          </div>
        </div>

        {/* Title & Subtitle */}
        <div className="text-center space-y-1">
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            {user ? 'Active Account Detected' : 'Welcome Back'}
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            {user ? 'Choose to continue or switch accounts' : 'Sign in to access your shared expense portal'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-950/80 border border-red-800/80 text-red-300 px-4 py-3 rounded-2xl text-left text-xs font-semibold flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-full bg-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Active Session View vs Login Form */}
        {user ? (
          <div className="space-y-5 text-center pt-2">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-900/60 text-left space-y-1.5">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Signed in as
              </span>
              <p className="text-sm font-bold text-emerald-400 flex items-center gap-2 break-all">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                <span>{user.email}</span>
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full py-3.5 px-6 rounded-full bg-[#10b981] hover:bg-emerald-400 text-slate-950 font-extrabold text-sm transition-all shadow-lg shadow-emerald-500/20 cursor-pointer border-none flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
              >
                <span>Continue to Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                onClick={async () => {
                  await signOut();
                }}
                className="w-full py-3 px-4 rounded-full bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 font-bold text-xs flex items-center justify-center gap-2 text-red-300 transition-all cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out & Log In as Different User</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Form */}
            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider block">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  autoComplete="off"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider block">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="new-password"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 rounded-full bg-[#10b981] hover:bg-emerald-400 text-slate-950 font-extrabold text-sm transition-all shadow-lg shadow-emerald-500/20 cursor-pointer border-none flex items-center justify-center gap-2 transform hover:-translate-y-0.5 disabled:opacity-50 mt-2"
              >
                {isSubmitting ? (
                  <span className="inline-block animate-spin h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-grow border-t border-slate-800/80" />
              <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">or</span>
              <div className="flex-grow border-t border-slate-800/80" />
            </div>

            {/* Google Sign In Button */}
            <button
              onClick={handleGoogleSignIn}
              type="button"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700 font-bold text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer text-slate-200 shadow-sm"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                <g transform="matrix(1, 0, 0, 1, 0, 0)">
                  <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.58h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.38C21.68,11.83 21.56,11.43 21.35,11.1z" fill="#4285F4" />
                  <path d="M12,20.62c2.6,0 4.78,-0.86 6.38,-2.34l-3.3,-2.58c-0.91,0.61 -2.08,0.98 -3.08,0.98 -2.38,0 -4.39,-1.61 -5.11,-3.77H3.45v2.66C5.07,18.8 8.35,20.62 12,20.62z" fill="#34A853" />
                  <path d="M6.89,12.91c-0.18,-0.54 -0.28,-1.11 -0.28,-1.7s0.1,-1.16 0.28,-1.7V6.85H3.45C2.81,8.12 2.45,9.57 2.45,11.21s0.36,3.09 1,4.36L6.89,12.91z" fill="#FBBC05" />
                  <path d="M12,5.38c1.41,0 2.68,0.49 3.68,1.44l2.76,-2.76C16.78,2.51 14.6,1.62 12,1.62c-3.65,0 -6.93,1.82 -8.55,4.78l3.44,2.66C7.61,6.99 9.62,5.38 12,5.38z" fill="#EA4335" />
                </g>
              </svg>
              <span>Sign In with Google</span>
            </button>

            {/* Footer Link */}
            <p className="text-center text-xs text-slate-400 font-medium">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-emerald-400 hover:text-emerald-300 font-extrabold ml-1 no-underline">
                Sign Up Free
              </Link>
            </p>
          </>
        )}

      </div>
    </div>
  );
}

