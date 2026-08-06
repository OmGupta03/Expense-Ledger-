'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';

export default function FinancialPulseChart({ expenses = [], monthlyLimit = 20000 }) {
  const [timeframe, setTimeframe] = useState('Last 30 Days');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Process real expenses into daily data points
  const chartData = useMemo(() => {
    if (!expenses || expenses.length === 0) {
      // Generate clean 10 timeline date slots with 0 spending for display
      const dates = [];
      const now = new Date();
      for (let i = 9; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i * 3);
        const label = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
        dates.push({ date: label, daily: 0, cumulative: 0 });
      }
      return dates;
    }

    // Group actual expenses by date
    const dateMap = {};
    expenses.forEach((e) => {
      const d = new Date(e.created_at || Date.now());
      const label = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
      const amt = parseFloat(e.amount || 0) * (e.currency === 'USD' ? 83 : 1);
      dateMap[label] = (dateMap[label] || 0) + amt;
    });

    const entries = Object.entries(dateMap).map(([date, daily]) => ({ date, daily }));
    
    let runningTotal = 0;
    return entries.map((item) => {
      runningTotal += item.daily;
      return {
        date: item.date,
        daily: Math.round(item.daily),
        cumulative: Math.round(runningTotal),
      };
    });
  }, [expenses]);

  const totalSpent = useMemo(() => {
    if (!expenses || expenses.length === 0) return 0;
    return expenses.reduce((sum, e) => {
      const amt = parseFloat(e.amount || 0);
      return sum + amt * (e.currency === 'USD' ? 83 : 1);
    }, 0);
  }, [expenses]);

  const maxDaily = useMemo(() => {
    const maxVal = Math.max(...chartData.map((d) => d.daily), 0);
    return maxVal > 0 ? maxVal * 1.2 : 5000;
  }, [chartData]);

  const maxCumulative = useMemo(() => {
    const maxVal = Math.max(...chartData.map((d) => d.cumulative), 0);
    return maxVal > 0 ? maxVal * 1.2 : 20000;
  }, [chartData]);

  // Chart dimensions
  const chartHeight = 125;
  const chartWidth = 900;
  const paddingX = 50;
  const paddingY = 15;
  const innerWidth = chartWidth - paddingX * 2;
  const innerHeight = chartHeight - paddingY * 2;

  // Generate path points for glowing line
  const points = chartData.map((d, index) => {
    const x = paddingX + (index / (chartData.length - 1 || 1)) * innerWidth;
    const y = chartHeight - paddingY - (d.cumulative / (maxCumulative || 1)) * innerHeight;
    return { x, y, data: d };
  });

  const pathD = points.reduce(
    (acc, point, index) =>
      index === 0
        ? `M ${point.x} ${point.y}`
        : `${acc} L ${point.x} ${point.y}`,
    ''
  );

  const areaD = points.length > 0 
    ? `${pathD} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`
    : '';

  return (
    <div className="stitch-glass-card rounded-2xl p-4 relative overflow-hidden transition-all text-left">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full">
              {timeframe}
            </span>
            {expenses.length === 0 && (
              <span className="text-[10px] text-slate-400 italic">
                (No expenses recorded yet)
              </span>
            )}
          </div>
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
          <div className="flex items-center gap-3 text-[11px] font-medium text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-blue-500 rounded-xs inline-block"></span>
              <span>Spending</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-emerald-400 rounded-full inline-block shadow-[0_0_6px_#22c55e]"></span>
              <span>Cumulative total</span>
            </div>
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
            <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.6" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Horizontal Grid lines */}
          {[0, 0.33, 0.66, 1].map((ratio, idx) => {
            const y = paddingY + ratio * innerHeight;
            const valLeft = Math.round((1 - ratio) * (maxDaily / 1.2));
            const valRight = Math.round((1 - ratio) * (maxCumulative / 1.2));
            return (
              <g key={idx}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={chartWidth - paddingX}
                  y2={y}
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray="3 3"
                />
                <text x={paddingX - 8} y={y + 3} fill="#64748b" fontSize="9" textAnchor="end">
                  ₹{valLeft.toLocaleString()}
                </text>
                <text x={chartWidth - paddingX + 8} y={y + 3} fill="#64748b" fontSize="9" textAnchor="start">
                  ₹{valRight.toLocaleString()}
                </text>
              </g>
            );
          })}

          {/* Area under green line */}
          {areaD && <path d={areaD} fill="url(#lineGradient)" />}

          {/* Blue Spending Bars */}
          {chartData.map((d, index) => {
            const barWidth = 14;
            const x = paddingX + (index / (chartData.length - 1 || 1)) * innerWidth - barWidth / 2;
            const barH = (d.daily / maxDaily) * innerHeight;
            const y = chartHeight - paddingY - barH;
            const isHovered = hoveredIndex === index;

            return (
              <rect
                key={index}
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barH, 2)}
                rx={2.5}
                fill="url(#barGradient)"
                className="transition-all duration-200 cursor-pointer hover:opacity-100"
                style={{ opacity: isHovered ? 1 : 0.75 }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            );
          })}

          {/* Glowing Green Cumulative Line */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#22c55e"
              strokeWidth="2.5"
              filter="url(#glow)"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data Points on Line */}
          {points.map((pt, index) => {
            const isHovered = hoveredIndex === index;
            return (
              <circle
                key={index}
                cx={pt.x}
                cy={pt.y}
                r={isHovered ? 5 : 3}
                fill="#22c55e"
                stroke="#0b130e"
                strokeWidth="1.5"
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            );
          })}

          {/* X-Axis Date Labels */}
          {chartData.map((d, index) => {
            if (chartData.length > 8 && index % 2 !== 0 && index !== chartData.length - 1) return null;
            const x = paddingX + (index / (chartData.length - 1 || 1)) * innerWidth;
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
            className="absolute top-1 bg-slate-900/95 border border-emerald-500/40 rounded-xl px-2.5 py-1.5 text-xs shadow-2xl z-20 pointer-events-none transition-all transform -translate-x-1/2"
            style={{
              left: `${((paddingX + (hoveredIndex / (chartData.length - 1 || 1)) * innerWidth) / chartWidth) * 100}%`,
            }}
          >
            <p className="font-bold text-white mb-0.5">{chartData[hoveredIndex].date}</p>
            <div className="space-y-0.5 text-[10px]">
              <p className="text-blue-400">Spending: ₹{chartData[hoveredIndex].daily.toLocaleString()}</p>
              <p className="text-emerald-400">Total: ₹{chartData[hoveredIndex].cumulative.toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
