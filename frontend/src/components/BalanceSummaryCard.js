import React from 'react';

function BalanceSummaryCard({ totalOwe = 0, totalOwed = 0 }) {
  return (
    <div className="balance-card">
      <div className="balance-header flex justify-between items-center border-b border-border-custom pb-3 mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">Account Summary</h3>
        <span className="text-text-muted text-xs select-none">☰</span>
      </div>
      <div className="balance-lines grid grid-cols-2 gap-4 text-left">
        <div>
          <p className="text-[10px] uppercase font-bold text-text-muted">You owe</p>
          <p className="you-owe font-extrabold text-xl text-red-owe">
            ₹{totalOwe.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="border-l border-border-custom pl-4">
          <p className="text-[10px] uppercase font-bold text-text-muted">You are owed</p>
          <p className="you-owed font-extrabold text-xl text-green-owed">
            ₹{totalOwed.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>
    </div>
  );
}

export default BalanceSummaryCard;
