'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { 
  Wallet, 
  Sparkles, 
  Users, 
  ArrowRight, 
  ShieldCheck, 
  FileSpreadsheet, 
  Zap, 
  Globe, 
  MessageSquare, 
  CheckCircle2,
  TrendingUp,
  CreditCard,
  PieChart
} from 'lucide-react';

const featuresList = [
  {
    icon: Users,
    title: 'Group Expense Tracking',
    desc: 'Share rent, groceries, trips, and dinners with flatmates. Track exactly who paid what in real-time.',
    badge: 'Core Feature'
  },
  {
    icon: Zap,
    title: 'Greedy Debt Consolidation',
    desc: 'Automated algorithm simplifies complex multi-member IOUs down to the fewest possible money transfers.',
    badge: 'Smart Math'
  },
  {
    icon: FileSpreadsheet,
    title: 'CSV Anomaly Ingestion Wizard',
    desc: 'Drag-and-drop bank statements. Auto-detects 20+ formatting anomalies and categorizes data before saving.',
    badge: 'CSV Wizard'
  },
  {
    icon: Globe,
    title: 'Multi-Currency Ledgers',
    desc: 'Native support for INR and USD. All transactions normalize smoothly at live conversion rates.',
    badge: 'INR & USD'
  },
  {
    icon: Sparkles,
    title: 'AI Financial Advisor',
    desc: 'Instant AI ledger diagnostics, budget health scores (0-100), and personalized savings recommendations.',
    badge: 'AI Powered'
  },
  {
    icon: MessageSquare,
    title: 'Real-time Expense Chat',
    desc: 'Discuss specific bill splits, attach notes, and clarify charges directly inside the expense drawer.',
    badge: 'Live Chat'
  }
];

const steps = [
  {
    step: '01',
    title: 'Create Your Group',
    desc: 'Set up a group for your apartment, vacation, or project team and invite members instantly.'
  },
  {
    step: '02',
    title: 'Add Expenses or Import CSV',
    desc: 'Log expenses on the go or upload bulk CSV bank statements using our anomaly detection wizard.'
  },
  {
    step: '03',
    title: 'Settle Up & Save',
    desc: 'View simplified balances and clear outstanding debts with single-click settlement logs.'
  }
];

export default function PublicLandingPage() {
  const { user, profile } = useAuth();

  const handleScrollToFeatures = (e) => {
    e.preventDefault();
    const el = document.getElementById('features');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="bg-[#07100b] text-white min-h-screen flex flex-col font-sans relative overflow-x-hidden select-none">
      
      {/* Background Ambient Glow & Tech Grid Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-950/40 via-[#07100b] to-[#07100b] pointer-events-none" />
      <div 
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#10b981 1px, transparent 1px), linear-gradient(90deg, #10b981 1px, transparent 1px)`,
          backgroundSize: '48px 48px'
        }}
      />

      <div className="relative z-10 flex flex-col flex-1">
        
        {/* ────────────── PUBLIC MARKETING NAVIGATION HEADER ────────────── */}
        <header className="px-6 md:px-12 py-5 flex items-center justify-between gap-6 border-b border-emerald-950/80 bg-[#07100b]/90 backdrop-blur-md sticky top-0 z-50">
          
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 no-underline">
            <div className="h-9.5 w-9.5 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
              <Wallet className="h-5 w-5 text-slate-950" />
            </div>
            <div>
              <div className="font-extrabold text-lg tracking-tight leading-none text-white">
                SmartCash
              </div>
              <div className="text-[10px] mt-1 leading-none font-semibold text-emerald-400">
                Student Group Finances
              </div>
            </div>
          </Link>

          {/* Right Authentication CTA */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#10b981] hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition-all shadow-lg shadow-emerald-500/20 no-underline cursor-pointer border-none"
            >
              <span>Sign In</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </header>

        {/* ────────────── HERO SECTION ────────────── */}
        <section className="max-w-7xl mx-auto w-full px-6 md:px-12 py-12 lg:py-20 flex flex-col lg:flex-row items-center justify-between gap-12 text-left">
          
          {/* Hero Left Content */}
          <div className="flex-1 space-y-6 max-w-xl">
            
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-800/50 text-emerald-400 text-[11px] font-extrabold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Next-Gen Shared Expense Platform</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1]">
              Smart Finances <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200">
                for Students & Groups
              </span>
            </h1>
            
            <p className="text-base sm:text-lg text-slate-300 font-medium leading-relaxed max-w-lg">
              Manage expenses, split flat rent, and track group budgets effortlessly. Features greedy debt consolidation, multi-currency support, and AI-powered ledger diagnostics.
            </p>

            <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#10b981] hover:bg-emerald-400 text-slate-950 font-extrabold text-sm transition-all shadow-xl shadow-emerald-500/20 cursor-pointer border-none no-underline transform hover:-translate-y-0.5"
              >
                <span>Get Started Free</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              
              <a
                href="#features"
                onClick={handleScrollToFeatures}
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-sm transition-all no-underline cursor-pointer"
              >
                Explore Features
              </a>
            </div>

            {/* Quick Feature Badges */}
            <div className="pt-4 flex items-center gap-6 text-slate-400 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Zero Subscription Fees</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Instant CSV Imports</span>
              </div>
            </div>

          </div>

          {/* Hero Right Visual: Dashboard Interface Mockup Preview */}
          <div className="flex-1 w-full max-w-2xl">
            <div className="stitch-glass-card rounded-3xl p-5 md:p-6 shadow-2xl border border-emerald-900/60 bg-[#0b1610]/90 backdrop-blur-xl relative overflow-hidden text-left">
              
              {/* Mock App Header */}
              <div className="flex items-center justify-between pb-4 border-b border-emerald-950/60">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500/80"></div>
                  <div className="h-3 w-3 rounded-full bg-yellow-500/80"></div>
                  <div className="h-3 w-3 rounded-full bg-emerald-500/80"></div>
                  <span className="text-[10px] font-bold text-slate-400 pl-2">SmartCash Dashboard</span>
                </div>
                <span className="text-[9px] font-extrabold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800/40">
                  LIVE DEMO PREVIEW
                </span>
              </div>

              {/* Mini Spending Line Graph Preview */}
              <div className="py-4">
                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 mb-2">
                  <span className="text-emerald-400 font-bold">Financial Pulse</span>
                  <span>Aug 2026 Spending</span>
                </div>

                <div className="h-20 w-full bg-gradient-to-b from-emerald-950/40 to-transparent rounded-xl p-2 relative flex items-end justify-between border border-emerald-900/30">
                  <div className="h-6 w-3 bg-blue-500/80 rounded-xs"></div>
                  <div className="h-10 w-3 bg-blue-500/80 rounded-xs"></div>
                  <div className="h-14 w-3 bg-blue-500/80 rounded-xs"></div>
                  <div className="h-8 w-3 bg-blue-500/80 rounded-xs"></div>
                  <div className="h-16 w-3 bg-emerald-400 rounded-xs shadow-[0_0_8px_#22c55e]"></div>
                </div>
              </div>

              {/* Mini Metric Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/80">
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase">Overall Balance</p>
                  <p className="text-base font-extrabold text-white mt-0.5">₹3,450.00</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase">You Are Owed</p>
                  <p className="text-base font-extrabold text-emerald-400 mt-0.5">₹5,200.00</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase">You Owe</p>
                  <p className="text-base font-extrabold text-red-400 mt-0.5">₹1,750.00</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase">Budget Left</p>
                  <p className="text-base font-extrabold text-emerald-400 mt-0.5">₹14,550</p>
                </div>
              </div>

              {/* Mini Group Item */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-950 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-xs">Flat 402 Roommates</h4>
                    <p className="text-[10px] text-emerald-400 font-bold">+₹3,450.00 Balance</p>
                  </div>
                </div>
                <span className="text-[8px] font-extrabold px-2 py-0.5 rounded-full stitch-badge-green">
                  YOU ARE OWED
                </span>
              </div>

            </div>
          </div>

        </section>

        {/* ────────────── FEATURES GRID SECTION ────────────── */}
        <section id="features" className="max-w-7xl mx-auto w-full px-6 md:px-12 py-16 border-t border-emerald-950/60 text-left">
          
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <span className="text-emerald-400 font-extrabold text-xs uppercase tracking-wider">Powerful Feature Suite</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Everything You Need to Manage Shared Bills
            </h2>
            <p className="text-slate-400 text-sm font-medium">
              Engineered specifically for roommates, friend groups, and student trips.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuresList.map((f, idx) => {
              const IconComp = f.icon;
              return (
                <div 
                  key={idx}
                  className="stitch-glass-card rounded-2xl p-6 border border-slate-800 hover:border-emerald-500/50 transition-all duration-300 space-y-3 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-emerald-950/80 border border-emerald-800/40 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                      <IconComp className="h-5 w-5" />
                    </div>
                    <span className="text-[9px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
                      {f.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-extrabold text-white group-hover:text-emerald-400 transition-colors">
                    {f.title}
                  </h3>

                  <p className="text-xs text-slate-400 font-medium leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              );
            })}
          </div>

        </section>

        {/* ────────────── HOW IT WORKS 3-STEP SECTION ────────────── */}
        <section id="how-it-works" className="max-w-7xl mx-auto w-full px-6 md:px-12 py-16 border-t border-emerald-950/60 text-left">
          
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <span className="text-emerald-400 font-extrabold text-xs uppercase tracking-wider">Simple 3-Step Process</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              How SmartCash Works
            </h2>
            <p className="text-slate-400 text-sm font-medium">
              Start splitting bills and consolidating debts in less than two minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s, idx) => (
              <div 
                key={idx} 
                className="stitch-glass-card rounded-2xl p-6 border border-slate-800 relative overflow-hidden space-y-4"
              >
                <span className="text-4xl font-black text-emerald-500/20 absolute top-4 right-6 pointer-events-none">
                  {s.step}
                </span>

                <div className="h-10 w-10 rounded-xl bg-emerald-500 text-slate-950 font-black text-sm flex items-center justify-center shadow-md">
                  {idx + 1}
                </div>

                <h3 className="text-lg font-extrabold text-white">
                  {s.title}
                </h3>

                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>

        </section>

        {/* ────────────── CALL TO ACTION BANNER ────────────── */}
        <section className="max-w-7xl mx-auto w-full px-6 md:px-12 py-16">
          <div className="stitch-glass-card rounded-3xl p-8 md:p-12 border border-emerald-500/40 bg-gradient-to-r from-emerald-950/60 via-slate-950 to-slate-950 text-center space-y-6 relative overflow-hidden shadow-2xl">
            
            <div className="max-w-2xl mx-auto space-y-3 relative z-10">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Ready to Simplify Your Group Finances?
              </h2>
              <p className="text-slate-300 text-sm font-medium">
                Join flatmates and student groups who track expenses and settle debts seamlessly with SmartCash.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#10b981] hover:bg-emerald-400 text-slate-950 font-extrabold text-sm transition-all shadow-xl shadow-emerald-500/20 cursor-pointer border-none no-underline transform hover:-translate-y-0.5"
              >
                <span>Get Started Free</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

          </div>
        </section>

      </div>

      {/* ────────────── FOOTER ────────────── */}
      <footer className="px-6 md:px-12 py-8 border-t border-emerald-950/80 bg-[#07100b] relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-400 font-medium">
          
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
              <Wallet className="h-4 w-4" />
            </div>
            <span className="font-extrabold text-sm text-white">SmartCash</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-emerald-400 transition-colors no-underline">Features</a>
            <a href="#how-it-works" className="hover:text-emerald-400 transition-colors no-underline">How It Works</a>
            <Link href="/login" className="hover:text-emerald-400 transition-colors no-underline">Sign In</Link>
            <Link href="/register" className="hover:text-emerald-400 transition-colors no-underline">Register</Link>
          </div>

          <div>
            © 2026 SmartCash. All rights reserved.
          </div>

        </div>
      </footer>

    </div>
  );
}
