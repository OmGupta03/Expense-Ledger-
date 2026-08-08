import React from 'react';
import { getCategoryIcon } from '../utils/categoryIcons';
import { Trash2 } from 'lucide-react';

function ExpenseRow({ expense, currentUserId, membersCount = 1, onClick, onDelete }) {
  const payerId = expense.paid_by?.id || expense.paid_by;
  const isMePayer = String(payerId) === String(currentUserId);
  const payerName = isMePayer ? 'You' : expense.payer?.name || 'Someone';

  const amount = parseFloat(expense.amount || 0);
  const currencySymbol = '₹';

  // Safe Date Parsing
  const dateObj = new Date(expense.created_at || expense.date);
  const isInvalid = isNaN(dateObj.getTime());
  const monthStr = isInvalid ? 'AUG' : dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const dayStr = isInvalid ? '07' : String(dateObj.getDate()).padStart(2, '0');

  // Estimate split share for visualization if we don't have splits preloaded
  const estimatedShare = amount / (membersCount || 1);
  let balanceText = '';
  let balanceAmount = 0;
  let balanceClass = '';

  if (isMePayer) {
    balanceText = 'YOU LENT';
    balanceAmount = amount - estimatedShare;
    balanceClass = 'text-emerald-400 font-extrabold';
  } else {
    balanceText = 'YOU BORROWED';
    balanceAmount = estimatedShare;
    balanceClass = 'text-red-400 font-extrabold';
  }

  return (
    <div
      onClick={onClick}
      className="stitch-glass-card rounded-2xl border border-emerald-900/60 bg-[#0b1610]/95 hover:bg-slate-900/90 px-5 py-4 flex items-center gap-4 cursor-pointer select-none transition-all shadow-md group text-left"
    >
      {/* Month/Day Date Box */}
      <div className="w-10 text-center flex-shrink-0">
        <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{monthStr}</span>
        <span className="block text-lg font-black text-white leading-none mt-0.5">{dayStr}</span>
      </div>

      {/* Category Icon Badge */}
      <div className="h-11 w-11 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-center text-xl flex-shrink-0 shadow-sm group-hover:border-emerald-500/40 transition-colors">
        {getCategoryIcon(expense.description)}
      </div>

      {/* Description & Payer Info */}
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-extrabold text-white truncate tracking-tight mb-0.5">{expense.description}</p>
        <p className="text-xs text-slate-400 truncate font-semibold">
          {payerName} paid <strong className="text-emerald-400">{currencySymbol}{amount.toFixed(2)}</strong>
        </p>
      </div>

      {/* Amount Lent / Borrowed */}
      <div className="text-right flex-shrink-0">
        <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{balanceText}</span>
        <span className={`text-base font-black tracking-tight mt-0.5 block ${balanceClass}`}>
          {currencySymbol}{balanceAmount.toFixed(2)}
        </span>
      </div>

      {/* Delete Action Button */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(expense.id);
          }}
          title="Delete expense"
          className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all border-none bg-transparent cursor-pointer ml-1 flex-shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default ExpenseRow;

