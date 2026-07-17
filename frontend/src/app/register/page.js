'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">🌲</div>
          <span className="auth-logo-text">Settle Up</span>
        </div>

        <h2 className="auth-title">Create Account</h2>
        <p className="auth-subtitle">Join a group of flatmates to track expenses</p>

        {error && (
          <div className="auth-error">
            <strong>Error:</strong> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="text-left">
            <label className="auth-label">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="auth-input"
              placeholder="e.g., Aisha"
              required
            />
          </div>

          <div className="text-left">
            <label className="auth-label">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              placeholder="e.g., aisha@example.com"
              required
            />
          </div>

          <div className="text-left">
            <label className="auth-label">Password (6+ chars)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="auth-btn"
          >
            {isSubmitting ? 'Registering...' : 'Sign Up'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link href="/login">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
