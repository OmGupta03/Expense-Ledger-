'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Wallet } from 'lucide-react';

export default function LoginPage() {
  const { user, signIn, signInWithGoogle, loading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (user && !loading) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

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
      router.push('/dashboard');
    } catch (err) {
      console.error('Google sign in error:', err);
      setError(err.message || 'Google authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4">
      <Card className="w-full max-w-sm flex flex-col gap-6 text-center select-none shadow-md">
        
        {/* Brand Logo Header */}
        <div className="flex flex-col items-center gap-2">
          <div className="h-11 w-11 rounded-full bg-green-bg flex items-center justify-center text-green-pri">
            <Wallet className="h-5.5 w-5.5" />
          </div>
          <span className="font-extrabold text-green-pri text-lg tracking-tight">SmartCash</span>
        </div>

        <div className="text-center">
          <h2 className="text-lg font-extrabold text-text-primary">Welcome Back</h2>
          <p className="text-xs text-text-muted mt-1 font-semibold">Sign in to your shared expense portal</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-owe px-4 py-2.5 rounded-xl text-left text-[11px] font-bold">
            <strong>Error:</strong> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g., aisha@example.com"
            required
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={isSubmitting}
            className="w-full mt-2"
          >
            Sign In
          </Button>
        </form>

        <div className="flex items-center">
          <div className="flex-grow border-t border-border-custom opacity-50"></div>
          <span className="mx-3 text-text-muted text-[10px] uppercase font-bold tracking-wider">or</span>
          <div className="flex-grow border-t border-border-custom opacity-50"></div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          type="button"
          className="w-full py-3 px-4 border border-border-custom rounded-full font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-50 transition-all cursor-pointer bg-white text-text-primary shadow-xs"
        >
          <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
            <g transform="matrix(1, 0, 0, 1, 0, 0)">
              <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.58h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.38C21.68,11.83 21.56,11.43 21.35,11.1z" fill="#4285F4" />
              <path d="M12,20.62c2.6,0 4.78,-0.86 6.38,-2.34l-3.3,-2.58c-0.91,0.61 -2.08,0.98 -3.08,0.98 -2.38,0 -4.39,-1.61 -5.11,-3.77H3.45v2.66C5.07,18.8 8.35,20.62 12,20.62z" fill="#34A853" />
              <path d="M6.89,12.91c-0.18,-0.54 -0.28,-1.11 -0.28,-1.7s0.1,-1.16 0.28,-1.7V6.85H3.45C2.81,8.12 2.45,9.57 2.45,11.21s0.36,3.09 1,4.36L6.89,12.91z" fill="#FBBC05" />
              <path d="M12,5.38c1.41,0 2.68,0.49 3.68,1.44l2.76,-2.76C16.78,2.51 14.6,1.62 12,1.62c-3.65,0 -6.93,1.82 -8.55,4.78l3.44,2.66C7.61,6.99 9.62,5.38 12,5.38z" fill="#EA4335" />
            </g>
          </svg>
          <span>Sign In with Google</span>
        </button>

        <p className="text-[11px] font-bold text-text-muted">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-green-pri hover:underline ml-1">
            Sign Up
          </Link>
        </p>
      </Card>
    </div>
  );
}
