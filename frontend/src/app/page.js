'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Wallet, Search, Sparkles, UserPlus, Users, Folder } from 'lucide-react';

export default function RootLandingPage() {
  const router = useRouter();
  const { user, profile } = useAuth();

  return (
    <div className="bg-[#07100b] text-white min-h-screen flex flex-col justify-between font-sans relative overflow-x-hidden select-none">
      
      {/* Background Ambient Glow & Grid Tech Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-900/25 via-[#07100b] to-[#07100b] pointer-events-none" />
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#10b981 1px, transparent 1px), linear-gradient(90deg, #10b981 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />

      <div className="relative z-10 flex flex-col flex-1">
        
        {/* Top Header Bar matching Stitch screenshot */}
        <header className="px-6 md:px-8 py-4 flex items-center justify-between gap-4 border-b border-emerald-950/80 bg-[#07100b]/80 backdrop-blur-md">
          
          {/* Left Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-md">
              <Wallet className="h-5 w-5 text-slate-950" />
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight leading-none text-white">
                SmartCash
              </div>
              <div className="text-[10px] mt-1 leading-none font-semibold text-slate-400">
                Student Group Finances
              </div>
            </div>
          </div>

          {/* Center Search Input */}
          <div className="hidden md:flex items-center relative max-w-sm w-full">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              readOnly
              placeholder="Search transactions or groups..."
              className="w-full pl-9 pr-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs text-slate-200 placeholder-slate-400 focus:outline-none cursor-default"
            />
          </div>

          {/* Right Header Action Buttons */}
          <div className="flex items-center gap-3">
            <Link
              href={user ? "/dashboard" : "/register"}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs no-underline"
            >
              <UserPlus className="h-3.5 w-3.5 text-slate-300" />
              <span>Invite Member</span>
            </Link>

            <Link
              href={user ? "/dashboard?ai=open" : "/login"}
              className="stitch-ai-button flex items-center gap-2 px-4 py-1.5 text-white text-xs font-extrabold rounded-full cursor-pointer shadow-lg border-none no-underline"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Analyze with AI</span>
            </Link>

            {/* Profile Avatar Pill */}
            <div className="flex items-center gap-2 pl-1">
              <span className="text-xs font-bold text-slate-200 hidden sm:inline">
                {profile?.name || user?.email?.split('@')[0] || 'Om Gupta'}
              </span>
              <div className="h-7 w-7 rounded-full bg-emerald-500 text-slate-950 font-extrabold text-xs flex items-center justify-center shadow-md">
                OG
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section Split Layout */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-6 md:px-8 py-12 lg:py-20 flex flex-col lg:flex-row items-center justify-between gap-12 text-left">
          
          {/* Left Column: Headline, Description & CTA */}
          <div className="flex-1 space-y-6 max-w-xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1]">
              Smart Finances <br />
              for Students
            </h1>
            
            <p className="text-base sm:text-lg text-slate-300 font-medium leading-relaxed max-w-md">
              Manage expenses, split bills, and track your budget with your student groups effortlessly.
            </p>

            <div className="pt-2">
              <Link
                href={user ? "/dashboard" : "/register"}
                className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-[#10b981] hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-xl shadow-emerald-500/20 cursor-pointer border-none no-underline transform hover:-translate-y-0.5"
              >
                {user ? "Go to Dashboard" : "Join Now"}
              </Link>
            </div>
          </div>

          {/* Right Column: Interactive Floating App Preview Card */}
          <div className="flex-1 w-full max-w-2xl">
            <div className="stitch-glass-card rounded-3xl p-5 md:p-6 shadow-2xl border border-emerald-900/60 bg-[#0b1610]/80 backdrop-blur-xl relative overflow-hidden">
              
              {/* Mini Spending Timeline Bar */}
              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 mb-4 pb-2 border-b border-emerald-950/60">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span className="text-slate-300">Jul 10</span>
                </div>
                <span>Jul 18</span>
                <span>Jul 22</span>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>Aug 08</span>
                </div>
              </div>

              {/* Mini Metric Cards Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                
                {/* Active Overall Balance Card with Emerald Border Highlight */}
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/80 text-left">
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Overall Balance</p>
                  <p className="text-lg font-extrabold text-white mt-1">₹0.00</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-left">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">You Are Owed</p>
                    <span className="text-[8px] font-bold text-emerald-400 bg-emerald-950 px-1 py-0.2 rounded">0%</span>
                  </div>
                  <p className="text-lg font-extrabold text-emerald-400 mt-1">₹0.00</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-left">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">You Owe</p>
                    <span className="text-[8px] font-bold text-red-400 bg-red-950 px-1 py-0.2 rounded">0%</span>
                  </div>
                  <p className="text-lg font-extrabold text-red-400 mt-1">₹0.00</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-left">
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Pending</p>
                  <p className="text-lg font-extrabold text-white mt-1">0</p>
                </div>

              </div>

              {/* Mini Your Groups Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 text-left">
                  <Users className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-xs font-extrabold text-white tracking-tight">Your Groups</h3>
                </div>

                {/* Group Item 1 */}
                <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3 text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-emerald-950 border border-emerald-800/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
                      <Users className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-white text-xs truncate">Room</h4>
                        <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded-full stitch-badge-neutral">
                          SETTLED UP
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-semibold">₹0.00 Balance</p>
                    </div>
                  </div>

                  <div className="hidden sm:block text-left">
                    <p className="text-[8px] font-extrabold text-slate-500 uppercase">Last Updated</p>
                    <p className="text-[10px] font-semibold text-slate-300">Yesterday</p>
                  </div>

                  <div className="hidden sm:flex flex-col text-left">
                    <p className="text-[8px] font-extrabold text-slate-500 uppercase mb-0.5">Member Stack</p>
                    <div className="flex -space-x-1.5">
                      <div className="h-5 w-5 rounded-full bg-slate-800 border border-[#0e1b14] text-[8px] font-bold text-slate-200 flex items-center justify-center">OG</div>
                      <div className="h-5 w-5 rounded-full bg-slate-800 border border-[#0e1b14] text-[8px] font-bold text-slate-200 flex items-center justify-center">OG</div>
                    </div>
                  </div>
                </div>

                {/* Group Item 2 */}
                <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3 text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-red-950/60 border border-red-800/40 flex items-center justify-center text-red-400 flex-shrink-0">
                      <Folder className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-white text-xs truncate">Project Alpha</h4>
                        <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded-full stitch-badge-red">
                          ₹550.00 PENDING
                        </span>
                      </div>
                      <p className="text-[10px] text-red-400 font-semibold">-₹550.00 Balance</p>
                    </div>
                  </div>

                  <div className="hidden sm:block text-left">
                    <p className="text-[8px] font-extrabold text-slate-500 uppercase">Last Updated</p>
                    <p className="text-[10px] font-semibold text-slate-300">Yesterday</p>
                  </div>

                  <div className="hidden sm:flex flex-col text-left">
                    <p className="text-[8px] font-extrabold text-slate-500 uppercase mb-0.5">Member Stack</p>
                    <div className="flex -space-x-1.5">
                      <div className="h-5 w-5 rounded-full bg-slate-800 border border-[#0e1b14] text-[8px] font-bold text-slate-200 flex items-center justify-center">OG</div>
                      <div className="h-5 w-5 rounded-full bg-emerald-800 border border-[#0e1b14] text-[8px] font-bold text-white flex items-center justify-center">+2</div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>

        </main>
      </div>

      {/* Footer matching Stitch screenshot */}
      <footer className="px-6 md:px-8 py-6 border-t border-emerald-950/80 bg-[#07100b] relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 font-medium">
          <div className="flex items-center gap-6">
            <Link href="#" className="hover:text-emerald-400 transition-colors no-underline text-current">About Us</Link>
            <Link href="#" className="hover:text-emerald-400 transition-colors no-underline text-current">Terms</Link>
            <Link href="#" className="hover:text-emerald-400 transition-colors no-underline text-current">Pricing</Link>
            <Link href="#" className="hover:text-emerald-400 transition-colors no-underline text-current">Contact</Link>
            <Link href="#" className="hover:text-emerald-400 transition-colors no-underline text-current">Help</Link>
          </div>
          <div>
            Copyright © SmartCash
          </div>
        </div>
      </footer>

    </div>
  );
}
