import React from 'react';
import Avatar from './ui/Avatar';
import { X } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="stitch-glass-card border border-emerald-900/60 bg-[#0b1610]/95 p-8 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative text-white flex flex-col space-y-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-900 transition-colors bg-transparent border-none cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Member Header Info */}
        <div className="flex items-center gap-4 pb-5 border-b border-slate-800 flex-shrink-0 text-left">
          <Avatar name={member.name} size={48} />
          <div>
            <h3 className="text-xl font-extrabold text-white tracking-tight leading-tight">{member.name}</h3>
          </div>
          <div className="ml-auto text-right">
            <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Net Balance</p>
            <p className={`text-base font-extrabold ${balance > 0.01 ? 'text-emerald-400' : balance < -0.01 ? 'text-red-400' : 'text-slate-400'}`}>
              {balance > 0.01 ? `owes you ₹${balance.toFixed(2)}` : balance < -0.01 ? `you owe ₹${Math.abs(balance).toFixed(2)}` : 'settled up'}
            </p>
          </div>
        </div>

        {/* Detailed Lists */}
        <div className="flex-1 overflow-y-auto mt-3 space-y-6 pr-1 text-left">
          {/* Credits Section */}
          <div>
            <h4 className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <span>🟢</span> Expenses Paid (Credits)
            </h4>
            {credits.length > 0 ? (
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/90 divide-y divide-slate-800">
                {credits.map((c, idx) => (
                  <div key={idx} className="flex justify-between items-center px-4 py-3 text-xs">
                    <div>
                      <p className="font-extrabold text-white">{c.description}</p>
                    </div>
                    <span className="text-emerald-400 font-extrabold">
                      +{c.currency === 'USD' ? '$' : '₹'}{c.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic px-2">No expenses paid by this member.</p>
            )}
          </div>

          {/* Settlements Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Settlements Paid */}
            <div>
              <h4 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <span>🤝</span> Payments Sent
              </h4>
              {settlementsPaid.length > 0 ? (
                <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/90 divide-y divide-slate-800">
                  {settlementsPaid.map((s, idx) => (
                    <div key={idx} className="flex justify-between items-center px-3.5 py-2.5 text-xs">
                      <div>
                        <p className="font-bold text-slate-200">To {s.paidToName}</p>
                      </div>
                      <span className="text-emerald-400 font-extrabold">
                        +{s.currency === 'USD' ? '$' : '₹'}{s.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic px-2">No settlements paid.</p>
              )}
            </div>

            {/* Settlements Received */}
            <div>
              <h4 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <span>🤝</span> Payments Received
              </h4>
              {settlementsReceived.length > 0 ? (
                <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/90 divide-y divide-slate-800">
                  {settlementsReceived.map((s, idx) => (
                    <div key={idx} className="flex justify-between items-center px-3.5 py-2.5 text-xs">
                      <div>
                        <p className="font-bold text-slate-200">From {s.paidByName}</p>
                      </div>
                      <span className="text-red-400 font-extrabold">
                        -{s.currency === 'USD' ? '$' : '₹'}{s.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic px-2">No settlements received.</p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Settle up actions */}
        {Math.abs(balance) > 0.01 && (
          <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end flex-shrink-0">
            <button
              onClick={() => {
                onSettleUp(balance);
                onClose();
              }}
              className="px-6 py-2.5 bg-[#10b981] hover:bg-emerald-400 text-slate-950 text-xs font-extrabold rounded-full shadow-lg shadow-emerald-500/20 transition-all cursor-pointer border-none"
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
