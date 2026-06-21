'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const features = [
  {
    icon: '👥',
    title: 'Together',
    desc: 'Share expenses with flatmates, friends, or travel companions. Split bills fairly across the group.'
  },
  {
    icon: '📊',
    title: 'Smart Splits',
    desc: 'Equal, unequal, percentage or ratio-based splits. Choose the method that fits every expense.'
  },
  {
    icon: '⚡',
    title: 'Instant',
    desc: 'Real-time balance calculations with greedy debt consolidation to minimize total transactions.'
  },
  {
    icon: '📥',
    title: 'CSV Import',
    desc: 'Drag-and-drop CSV imports with a 20-anomaly auto-detection pipeline. Review before saving.'
  },
  {
    icon: '💱',
    title: 'Multi-Currency',
    desc: 'Enter expenses in INR or USD. All amounts are automatically normalized at 1 USD = 83 INR.'
  },
  {
    icon: '⚖️',
    title: 'Balances',
    desc: 'See who owes whom at a glance. One-click settle-up buttons simplify paying back friends.'
  }
];

export default function RootLandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (user && !loading) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const handleFeatureClick = () => {
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading Expense Ledger...</p>
      </div>
    );
  }

  return (
    <div className="landing-page text-text-primary">
      {/* ──────────── NAV BAR ──────────── */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <Link href="/" className="landing-logo">
            <span className="landing-logo-icon">⬡</span>
            <span className="landing-logo-text">Expense Ledger</span>
          </Link>

          <div className="landing-nav-links">
            <Link href="/login" className="landing-nav-link">Sign In</Link>
            <Link href="/register" className="landing-btn-primary">Sign Up</Link>
          </div>
        </div>
      </nav>

      {/* ──────────── HERO SECTION ──────────── */}
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div className="landing-hero-text text-left">
            <h1 className="landing-hero-title">
              The last expense<br />app you&apos;ll ever need!
            </h1>
            <p className="landing-hero-desc">
              Expense Ledger is a smart shared expense manager for flatmates and friend groups.
              Easily add expenses, import CSVs, split bills with multiple methods, and
              track who owes whom — so you always know the score.
            </p>
            <div className="landing-hero-actions">
              <Link href="/register" className="landing-btn-primary landing-btn-lg">
                Get Started Free
              </Link>
              <Link href="/login" className="landing-btn-outline landing-btn-lg">
                Sign In
              </Link>
            </div>
          </div>

          <div className="landing-hero-visual">
            <div className="landing-mockup">
              <div className="mockup-header">
                <span className="mockup-dot red"></span>
                <span className="mockup-dot yellow"></span>
                <span className="mockup-dot green"></span>
                <span className="mockup-title">Dashboard</span>
              </div>
              <div className="mockup-body text-left">
                <div className="mockup-balance-row">
                  <div className="mockup-balance">
                    <span className="mockup-label">You owe</span>
                    <span className="mockup-value owe text-red-owe">₹2,450.00</span>
                  </div>
                  <div className="mockup-balance">
                    <span className="mockup-label">You are owed</span>
                    <span className="mockup-value owed text-green-owed">₹5,100.00</span>
                  </div>
                </div>
                <div className="mockup-list">
                  <div className="mockup-item">
                    <span className="mockup-item-icon">🛒</span>
                    <div className="mockup-item-info">
                      <span className="mockup-item-name">Groceries</span>
                      <span className="mockup-item-sub">Priya paid ₹1,200</span>
                    </div>
                    <span className="mockup-item-amt owed text-green-owed">+₹600</span>
                  </div>
                  <div className="mockup-item">
                    <span className="mockup-item-icon">⚡</span>
                    <div className="mockup-item-info">
                      <span className="mockup-item-name">Electricity Bill</span>
                      <span className="mockup-item-sub">Rohan paid ₹3,400</span>
                    </div>
                    <span className="mockup-item-amt owe text-red-owe">-₹850</span>
                  </div>
                  <div className="mockup-item">
                    <span className="mockup-item-icon">🏠</span>
                    <div className="mockup-item-info">
                      <span className="mockup-item-name">Rent — May</span>
                      <span className="mockup-item-sub">Aisha paid ₹24,000</span>
                    </div>
                    <span className="mockup-item-amt owe text-red-owe">-₹8,000</span>
                  </div>
                  <div className="mockup-item">
                    <span className="mockup-item-icon">🤝</span>
                    <div className="mockup-item-info">
                      <span className="mockup-item-name">Settlement</span>
                      <span className="mockup-item-sub">You paid Rohan</span>
                    </div>
                    <span className="mockup-item-amt owed text-green-owed">+₹2,000</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────── FEATURES GRID ──────────── */}
      <section className="landing-features">
        <div className="landing-features-inner">
          {features.map((f, i) => (
            <div className="landing-feature-card text-left" key={i}>
              <span className="landing-feature-icon">{f.icon}</span>
              <h3 className="landing-feature-title">{f.title}</h3>
              <p className="landing-feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ──────────── CTA SECTION ──────────── */}
      <section className="landing-cta">
        <div className="landing-cta-inner">
          <div className="landing-cta-box text-left">
            <div className="landing-cta-icon">💸</div>
            <div className="landing-cta-content">
              <h2 className="landing-cta-title">Start splitting expenses today</h2>
              <p className="landing-cta-desc">
                Create a free account, invite your flatmates, and never argue about bills again. Import existing data via CSV or add expenses manually.
              </p>
              <div className="landing-cta-buttons">
                <Link href="/register" className="landing-btn-primary landing-btn-lg">
                  Create Free Account
                </Link>
                <Link href="/login" className="landing-btn-outline landing-btn-lg">
                  Sign In Instead
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────── FOOTER ──────────── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <span className="landing-footer-logo">⬡ Expense Ledger</span>
          <span className="landing-footer-copy">© 2026 Spreetail Shared Expenses. Built for flatmates.</span>
        </div>
      </footer>
    </div>
  );
}
