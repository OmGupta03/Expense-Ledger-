import React from 'react';
import { getCategoryIcon } from '../utils/categoryIcons';

function ExpenseRow({ expense, currentUserId, membersCount = 1, onClick }) {
  const payerId = expense.paid_by?.id || expense.paid_by;
  const isMePayer = String(payerId) === String(currentUserId);
  const payerName = isMePayer ? 'You' : expense.payer?.name || 'Someone';

  const amount = parseFloat(expense.amount || 0);
  const currencySymbol = expense.currency === 'USD' ? '$' : '₹';

  // Safe Date Parsing
  const dateObj = new Date(expense.created_at || expense.date);
  const isInvalid = isNaN(dateObj.getTime());
  const monthStr = isInvalid ? 'JUN' : dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const dayStr = isInvalid ? '21' : String(dateObj.getDate()).padStart(2, '0');

  // Estimate split share for visualization if we don't have splits preloaded
  const estimatedShare = amount / (membersCount || 1);
  let balanceText = '';
  let balanceAmount = 0;
  let balanceClass = '';

  if (isMePayer) {
    balanceText = 'you lent';
    balanceAmount = amount - estimatedShare;
    balanceClass = 'text-green-owed';
  } else {
    balanceText = 'you borrowed';
    balanceAmount = estimatedShare;
    balanceClass = 'text-red-owe';
  }

  return (
    <div
      onClick={onClick}
      className="expense-row flex items-center gap-3.5 px-4 py-3 bg-white border-b border-border-custom hover:bg-slate-50 cursor-pointer select-none transition-all"
    >
      {/* Date */}
      <div className="exp-date-col w-9 text-center flex-shrink-0">
        <span className="exp-month block text-[9px] font-bold text-text-muted tracking-wide">{monthStr}</span>
        <span className="exp-day block text-lg font-bold text-text-primary leading-none mt-0.5">{dayStr}</span>
      </div>

      {/* Category Icon */}
      <div className="exp-icon text-xl bg-grey-bg rounded-lg p-2 flex-shrink-0 select-none">
        {getCategoryIcon(expense.description)}
      </div>

      {/* Title & Payer info */}
      <div className="exp-info flex-1 min-w-0 text-left">
        <p className="exp-title text-sm font-semibold text-text-primary truncate">{expense.description}</p>
        <p className="exp-sub text-xs text-text-muted mt-0.5 truncate">
          {payerName} paid <span className="font-medium">{currencySymbol}{amount.toFixed(2)}</span>
        </p>
      </div>

      {/* Relative balance info */}
      <div className="exp-balance-col text-right flex-shrink-0 text-xs">
        <span className="balance-label block text-[10px] text-text-muted uppercase tracking-wider">{balanceText}</span>
        <span className={`font-bold ${balanceClass} text-sm mt-0.5 block`}>
          {currencySymbol}{balanceAmount.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

export default ExpenseRow;
