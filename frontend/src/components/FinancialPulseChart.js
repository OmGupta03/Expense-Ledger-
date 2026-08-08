'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';

export default function FinancialPulseChart({ expenses = [], currentUserId = null, monthlyLimit = 20000 }) {
  const [timeframe, setTimeframe] = useState('Last 30 Days');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Calculate the user's specific expense share for an expense item
  const getUserExpenseShare = (e) => {
    if (!e || !currentUserId) return parseFloat(e?.amount || 0);
    const splits = e.expense_splits || e.splits || [];
    if (splits.length > 0) {
      const userSplit = splits.find((s) => String(s.user_id || s.userId) === String(currentUserId));
      if (userSplit) {
        return parseFloat(userSplit.amount || 0);
      }
      return 0;
    }
    const payerId = e.paid_by?.id || e.paid_by;
    if (String(payerId) === String(currentUserId)) {
      return parseFloat(e.amount || 0);
    }
    return 0;
  };

  // Process user's actual calculated expenses into daily data points
  const chartData = useMemo(() => {
    if (!expenses || expenses.length === 0) {
      const dates = [];
      const now = new Date();
      for (let i = 9; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i * 3);
        const label = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
        dates.push({ date: label, daily: 0 });
      }
      return dates;
    }

    // Group logged-in user's expense shares by date
    const dateMap = {};
    expenses.forEach((e) => {
      const share = getUserExpenseShare(e);
      if (share <= 0) return;

      const d = new Date(e.created_at || Date.now());
      const label = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
      if (!dateMap[label]) {
        dateMap[label] = { date: label, daily: 0, timestamp: d.getTime() };
      }
      dateMap[label].daily += share;
    });

    const entries = Object.values(dateMap).sort((a, b) => a.timestamp - b.timestamp);
    
    if (entries.length === 0) {
      const now = new Date();
      const label = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
      return [{ date: label, daily: 0 }];
    }

    return entries.map((item) => ({
      date: item.date,
      daily: Number(item.daily.toFixed(2)),
    }));
  }, [expenses, currentUserId]);

  const totalSpent = useMemo(() => {
    if (!expenses || expenses.length === 0) return 0;
    return expenses.reduce((sum, e) => {
      const share = getUserExpenseShare(e);
      return sum + share;
    }, 0);
  }, [expenses, currentUserId]);

  const maxDaily = useMemo(() => {
    const maxVal = Math.max(...chartData.map((d) => d.daily), 0);
    return maxVal > 0 ? maxVal * 1.35 : 5000;
  }, [chartData]);

  // Chart layout dimensions
  const chartHeight = 140;
  const chartWidth = 900;
  const paddingLeft = 85;
  const paddingRight = 40;
  const paddingY = 22;
  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingY * 2;

  // Dynamic step spacing calculation so bars stay close to each other
  const maxStep = 65; // pixels between bar centers
  const numItems = chartData.length;
  const step = numItems > 1 ? Math.min(maxStep, innerWidth / (numItems - 1)) : 0;
  const totalSpan = (numItems - 1) * step;
  const startX = numItems > 1 && totalSpan < innerWidth ? paddingLeft + 30 : paddingLeft;

  const getX = (index) => {
    if (numItems <= 1) return paddingLeft + 50;
    return startX + index * step;
  };

  return (
    <div className="stitch-glass-card rounded-2xl p-4 relative overflow-hidden transition-all text-left">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div>
          {expenses.length === 0 && (
            <div className="mb-0.5">
              <span className="text-[10px] text-slate-400 italic">
                (No expenses recorded yet)
              </span>
            </div>
          )}
          <div className="flex items-baseline gap-2.5">
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              ₹{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[11px] font-medium text-slate-400">spent</span>
            </h2>
            <span className="text-[11px] font-semibold text-slate-400">
              Monthly Limit: <strong className="text-slate-200">₹{monthlyLimit.toLocaleString()}</strong>
            </span>
          </div>
        </div>

        {/* Legend & Controls */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-300">
            <span className="w-2.5 h-2.5 bg-blue-500 rounded-xs inline-block"></span>
            <span>Daily Spending</span>
          </div>

          {/* Timeframe Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all cursor-pointer"
            >
              <span>{timeframe}</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 top-8 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-30 w-32 text-xs text-slate-300">
                {['Last 7 Days', 'Last 30 Days', 'Last 90 Days', 'This Year'].map((tf) => (
                  <button
                    key={tf}
                    onClick={() => {
                      setTimeframe(tf);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-emerald-950/60 hover:text-emerald-400 transition-colors cursor-pointer ${
                      timeframe === tf ? 'text-emerald-400 font-bold bg-emerald-950/40' : ''
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SVG Chart Area */}
      <div className="relative w-full overflow-x-auto">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto min-w-[600px] overflow-visible">
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.6" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines with Left Scaling */}
          {[0, 0.33, 0.66, 1].map((ratio, idx) => {
            const y = paddingY + ratio * innerHeight;
            const valLeft = Number(((1 - ratio) * (maxDaily / 1.35)).toFixed(0));
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={chartWidth - paddingRight}
                  y2={y}
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray="3 3"
                />
                <text x={paddingLeft - 18} y={y + 3} fill="#64748b" fontSize="9" textAnchor="end">
                  ₹{valLeft.toLocaleString()}
                </text>
              </g>
            );
          })}

          {/* Blue Spending Bars & Spend Amount Above Each Bar */}
          {chartData.map((d, index) => {
            const barWidth = 20;
            const cx = getX(index);
            const x = cx - barWidth / 2;
            const barH = (d.daily / maxDaily) * innerHeight;
            const y = chartHeight - paddingY - barH;
            const isHovered = hoveredIndex === index;

            return (
              <g key={index}>
                {/* Total Spend Amount Text Above Bar */}
                {d.daily > 0 && (
                  <text
                    x={cx}
                    y={y - 6}
                    fill="#60a5fa"
                    fontSize="10"
                    fontWeight="800"
                    textAnchor="middle"
                    className="select-none transition-all duration-200"
                  >
                    ₹{d.daily.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </text>
                )}

                {/* Spending Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(barH, 2)}
                  rx={3.5}
                  fill="url(#barGradient)"
                  className="transition-all duration-200 cursor-pointer hover:opacity-100"
                  style={{ opacity: isHovered ? 1 : 0.85 }}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              </g>
            );
          })}

          {/* X-Axis Date Labels */}
          {chartData.map((d, index) => {
            if (chartData.length > 12 && index % 2 !== 0 && index !== chartData.length - 1) return null;
            const x = getX(index);
            return (
              <text key={index} x={x} y={chartHeight - 2} fill="#94a3b8" fontSize="9" textAnchor="middle">
                {d.date}
              </text>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIndex !== null && chartData[hoveredIndex] && (
          <div
            className="absolute top-1 bg-slate-900/95 border border-blue-500/40 rounded-xl px-2.5 py-1.5 text-xs shadow-2xl z-20 pointer-events-none transition-all transform -translate-x-1/2"
            style={{
              left: `${(getX(hoveredIndex) / chartWidth) * 100}%`,
            }}
          >
            <p className="font-bold text-white mb-0.5">{chartData[hoveredIndex].date}</p>
            <p className="text-blue-400 font-extrabold text-[11px]">Spending: ₹{chartData[hoveredIndex].daily.toLocaleString()}</p>
          </div>
        )}
      </div>
    </div>
  );
}


