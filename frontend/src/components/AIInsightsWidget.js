'use client';

import React, { useState } from 'react';
import { Sparkles, X, CreditCard, PiggyBank, Wallet, ArrowRight, TrendingUp } from 'lucide-react';

export default function AIInsightsWidget({ isOpen = true, onClose, onOpenModal }) {
  const [visible, setVisible] = useState(isOpen);

  if (!visible) return null;

  return (
    <div className="stitch-glass-card rounded-2xl p-5 w-full max-w-sm shadow-2xl relative border border-emerald-900/60 bg-slate-950/80 backdrop-blur-xl text-left animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Sparkles className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-extrabold text-white tracking-wide">AI Insights</h3>
        </div>
        <button
          onClick={() => {
            setVisible(false);
            if (onClose) onClose();
          }}
          className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800 cursor-pointer border-none bg-transparent"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Insights List */}
      <div className="space-y-3.5">
        {/* Item 1: Top Money Leaks */}
        <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-purple-500/40 transition-all">
          <div className="p-2 rounded-full bg-purple-950 text-purple-400 border border-purple-800/50 flex-shrink-0">
            <CreditCard className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-100">Top Money Leaks</h4>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
              High food delivery spend. Consider setting a weekly dining budget.
            </p>
          </div>
        </div>

        {/* Item 2: Savings Opportunities */}
        <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-blue-500/40 transition-all">
          <div className="p-2 rounded-full bg-blue-950 text-blue-400 border border-blue-800/50 flex-shrink-0">
            <PiggyBank className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-100">Savings Opportunities</h4>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
              Reduce unused subscription costs to save up to <strong className="text-emerald-400">₹800/mo</strong>.
            </p>
          </div>
        </div>

        {/* Item 3: Key Daily Habit Change */}
        <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/40 transition-all">
          <div className="p-2 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/50 flex-shrink-0">
            <Wallet className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-100">Key Daily Habit Change</h4>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
              Pack lunch 3 days a week to save estimated <strong className="text-emerald-400">₹4,000/mo</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <button
        onClick={onOpenModal}
        className="w-full mt-4 py-2 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border-none"
      >
        <Sparkles className="h-3.5 w-3.5" />
        <span>Run Deep AI Audit</span>
      </button>
    </div>
  );
}
