import React from 'react';
import Avatar from './Avatar';

function PersonBalanceRow({ person, balance = 0, onClick }) {
  return (
    <div
      onClick={onClick}
      className="person-row flex items-center justify-between py-3 border-b border-border-custom hover:bg-black/2 cursor-pointer transition-all px-2 rounded-lg select-none"
    >
      <div className="flex items-center gap-3.5">
        <Avatar name={person.name} size={36} />
        <span className="person-name font-medium text-text-primary text-sm">{person.name}</span>
      </div>
      <div className="person-balance text-right text-xs">
        {balance > 0.01 ? (
          <span className="owes-you text-green-owed font-bold">owes you ₹{balance.toFixed(2)} ›</span>
        ) : balance < -0.01 ? (
          <span className="you-owe text-red-owe font-bold">you owe ₹{Math.abs(balance).toFixed(2)} ›</span>
        ) : (
          <span className="settled text-text-muted">settled up ›</span>
        )}
      </div>
    </div>
  );
}

export default PersonBalanceRow;
