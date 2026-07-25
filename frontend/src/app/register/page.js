'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { TreePine } from 'lucide-react';

export default function RegisterPage() {
  const { user, signUp, loading } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
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
            <TreePine className="h-5.5 w-5.5" />
          </div>
          <span className="font-extrabold text-green-pri text-lg tracking-tight">Settle Up</span>
        </div>

        <div className="text-center">
          <h2 className="text-lg font-extrabold text-text-primary">Create Account</h2>
          <p className="text-xs text-text-muted mt-1 font-semibold">Join a group of flatmates to track expenses</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-owe px-4 py-2.5 rounded-xl text-left text-[11px] font-bold">
            <strong>Error:</strong> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Full Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Aisha"
            required
          />

          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. aisha@example.com"
            required
          />

          <Input
            label="Password (min 6 chars)"
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
            Create Account
          </Button>
        </form>

        <p className="text-[11px] font-bold text-text-muted">
          Already have an account?{' '}
          <Link href="/login" className="text-green-pri hover:underline ml-1">
            Sign In
          </Link>
        </p>
      </Card>
    </div>
  );
}
