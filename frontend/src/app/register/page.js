'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Wallet, ArrowRight, ArrowLeft, LogOut } from 'lucide-react';

export default function RegisterPage() {
  const { user, signUp, signOut, loading } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await signUp(email, password, name);
      // Wait a moment for public.users profile creation database trigger
      setTimeout(() => {
        router.push('/dashboard');
      }, 1200);
    } catch (err) {
      console.error('Sign up error:', err);
      setError(err.message || 'Error occurred during registration');
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

      {/* Central Glassmorphic Register Card */}
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
            {user ? 'Active Account Detected' : 'Create Account'}
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            {user ? 'Sign out to register a new user account' : 'Join flatmates and friend groups to manage expenses'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-950/80 border border-red-800/80 text-red-300 px-4 py-3 rounded-2xl text-left text-xs font-semibold flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-full bg-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {user ? (
          <div className="space-y-5 text-center pt-2">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-900/60 text-left space-y-1.5">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Currently signed in as
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
                <span>Go to Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                onClick={async () => {
                  await signOut();
                }}
                className="w-full py-3 px-4 rounded-full bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 font-bold text-xs flex items-center justify-center gap-2 text-red-300 transition-all cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out & Create New Account</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Form */}
            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider block">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  autoComplete="off"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider block">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  autoComplete="off"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider block">
                  Password (min 6 chars)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
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
                    <span>Get Started Free</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Footer Link */}
            <p className="text-center text-xs text-slate-400 font-medium">
              Already have an account?{' '}
              <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-extrabold ml-1 no-underline">
                Sign In
              </Link>
            </p>
          </>
        )}

      </div>
    </div>
  );
}

