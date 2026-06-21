import React from 'react';
import Avatar from './Avatar';

function BalanceDrilldownModal({ member, balance = 0, expenses = [], settlements = [], members = [], onSettleUp, onClose }) {
  if (!member) return null;

  const memberId = member.id;

  // Filter credits (expenses paid by this member)
  const credits = expenses
    .filter((e) => (e.paid_by?.id || e.paid_by) === memberId)
    .map((e) => ({
      description: e.description,
      amount: parseFloat(e.amount),
      currency: e.currency || 'INR'
    }));

  // Filter settlements paid by this member
  const settlementsPaid = settlements
    .filter((s) => (s.payer_id?.id || s.payer_id) === memberId)
    .map((s) => ({
      amount: parseFloat(s.amount),
      currency: s.currency || 'INR',
      paidToName: s.payee?.name || 'Someone'
    }));

  // Filter settlements received by this member
  const settlementsReceived = settlements
    .filter((s) => (s.payee_id?.id || s.payee_id) === memberId)
    .map((s) => ({
      amount: parseFloat(s.amount),
      currency: s.currency || 'INR',
      paidByName: s.payer?.name || 'Someone'
    }));

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-border-custom p-6 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative text-text-primary flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-muted hover:text-text-primary font-bold text-sm cursor-pointer"
        >
          ✕
        </button>

        {/* Member Header Info */}
        <div className="flex items-center gap-4 pb-5 border-b border-border-custom flex-shrink-0 text-left">
          <Avatar name={member.name} size={48} />
          <div>
            <h3 className="text-lg font-bold text-text-primary leading-tight">{member.name}</h3>
          </div>
          <div className="ml-auto text-right">
            <p className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Net Balance</p>
            <p className={`text-lg font-black ${balance > 0.01 ? 'text-green-owed' : balance < -0.01 ? 'text-red-owe' : 'text-text-muted'}`}>
              {balance > 0.01 ? `owes you ₹${balance.toFixed(2)}` : balance < -0.01 ? `you owe ₹${Math.abs(balance).toFixed(2)}` : 'settled up'}
            </p>
          </div>
        </div>

        {/* Detailed Lists */}
        <div className="flex-1 overflow-y-auto mt-5 space-y-6 pr-1 text-left">
          {/* Credits Section */}
          <div>
            <h4 className="text-xs font-bold text-green-owed uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>🟢</span> Expenses Paid (Credits)
            </h4>
            {credits.length > 0 ? (
              <div className="border border-border-custom rounded-lg overflow-hidden bg-slate-50/50 divide-y divide-border-custom">
                {credits.map((c, idx) => (
                  <div key={idx} className="flex justify-between items-center px-4 py-2.5 text-xs">
                    <div>
                      <p className="font-semibold text-text-primary">{c.description}</p>
                    </div>
                    <span className="text-green-owed font-bold">
                      +{c.currency === 'USD' ? '$' : '₹'}{c.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted italic px-2">No expenses paid by this member.</p>
            )}
          </div>

          {/* Settlements Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Settlements Paid */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>🤝</span> Payments Sent
              </h4>
              {settlementsPaid.length > 0 ? (
                <div className="border border-border-custom rounded-lg overflow-hidden bg-slate-50/50 divide-y divide-border-custom">
                  {settlementsPaid.map((s, idx) => (
                    <div key={idx} className="flex justify-between items-center px-3 py-2 text-xs">
                      <div>
                        <p className="font-medium text-slate-700">To {s.paidToName}</p>
                      </div>
                      <span className="text-green-owed font-bold">
                        +{s.currency === 'USD' ? '$' : '₹'}{s.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-text-muted italic px-2">No settlements paid.</p>
              )}
            </div>

            {/* Settlements Received */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>🤝</span> Payments Received
              </h4>
              {settlementsReceived.length > 0 ? (
                <div className="border border-border-custom rounded-lg overflow-hidden bg-slate-50/50 divide-y divide-border-custom">
                  {settlementsReceived.map((s, idx) => (
                    <div key={idx} className="flex justify-between items-center px-3 py-2 text-xs">
                      <div>
                        <p className="font-medium text-slate-700">From {s.paidByName}</p>
                      </div>
                      <span className="text-red-owe font-bold">
                        -{s.currency === 'USD' ? '$' : '₹'}{s.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-text-muted italic px-2">No settlements received.</p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Settle up actions */}
        {Math.abs(balance) > 0.01 && (
          <div className="mt-6 pt-4 border-t border-border-custom flex justify-end flex-shrink-0">
            <button
              onClick={() => {
                onSettleUp(balance);
                onClose();
              }}
              className="px-5 py-2.5 bg-green-pri hover:bg-green-light text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              Settle up directly with {member.name}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default BalanceDrilldownModal;
