import React from 'react';
import Avatar from './ui/Avatar';

function PersonBalanceRow({ person, balance = 0, onClick, isDark = true }) {
  return (
    <div
      onClick={onClick}
      className={`person-row flex items-center justify-between py-3 px-3 rounded-xl cursor-pointer transition-all select-none ${
        isDark 
          ? 'border-b border-emerald-950/60 hover:bg-slate-900/60 text-white' 
          : 'border-b border-border-custom hover:bg-black/5 text-slate-900'
      }`}
    >
      <div className="flex items-center gap-3.5">
        <Avatar name={person.name} size={36} />
        <span className={`person-name font-bold text-sm ${isDark ? 'text-white' : 'text-text-primary'}`}>{person.name}</span>
      </div>
      <div className="person-balance text-right text-xs">
        {balance > 0.01 ? (
          <span className={`owes-you font-extrabold ${isDark ? 'text-emerald-400' : 'text-green-owed'}`}>owes you ₹{balance.toFixed(2)} ›</span>
        ) : balance < -0.01 ? (
          <span className={`you-owe font-extrabold ${isDark ? 'text-red-400' : 'text-red-owe'}`}>you owe ₹{Math.abs(balance).toFixed(2)} ›</span>
        ) : (
          <span className={`settled font-semibold ${isDark ? 'text-slate-400' : 'text-text-muted'}`}>settled up ›</span>
        )}
      </div>
    </div>
  );
}

export default PersonBalanceRow;
