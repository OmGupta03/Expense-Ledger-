import React from 'react';
import Avatar from './ui/Avatar';
import { getCategoryIcon } from '../utils/categoryIcons';
import { Send, MessageSquare, X } from 'lucide-react';

function ExpenseDetail({ 
  expense, 
  splits = [], 
  group = {}, 
  currentUser = {}, 
  onClose, 
  onDelete,
  chatMessages = [],
  newMessage = '',
  setNewMessage,
  onSendMessage,
  chatLoading = false,
  chatBottomRef
}) {
  const payer = expense.payer;
  const payerId = expense.paid_by;
  const payerName = payer?.name || 'Someone';

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'Date unknown' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const amount = parseFloat(expense.amount || 0);
  const currencySymbol = '₹';

  return (
    <div className="stitch-glass-card rounded-3xl p-6 border border-emerald-900/60 bg-[#0b1610]/95 text-white relative text-left shadow-2xl space-y-4">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-900 transition-colors bg-transparent border-none cursor-pointer"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Header */}
      <div className="flex gap-4 items-start pb-5 border-b border-slate-800">
        <div className="text-3xl bg-slate-900/90 border border-slate-800 rounded-2xl p-3 select-none flex-shrink-0">
          {getCategoryIcon(expense.description)}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-extrabold text-white truncate tracking-tight">{expense.description}</h2>
          <p className="text-2xl font-black text-emerald-400 mt-1 tracking-tight">
            {currencySymbol}{amount.toFixed(2)}
          </p>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            {group.name || 'Flat'} · {formatDate(expense.created_at || expense.date)}
          </p>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">
            Added by <span className="font-bold text-white">{payerName}</span>
          </p>
        </div>
      </div>

      {/* Splits List */}
      <div className="py-2 space-y-3 border-b border-slate-800">
        <div className="flex items-center gap-3 py-1 text-xs text-white">
          <Avatar name={payerName} size={32} />
          <span>
            <strong className="text-white font-extrabold">{payerName}</strong> paid <strong className="text-emerald-400 font-extrabold">{currencySymbol}{amount.toFixed(2)}</strong>
          </span>
        </div>

        <div className="border-t border-slate-800/80 pt-3">
          <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider mb-2">Split Breakdown</p>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {splits.map((s) => {
              const uId = s.user?.id || s.user_id;
              const uName = s.user?.name || 'User';
              const isPayer = String(uId) === String(payerId);
              const splitAmt = parseFloat(s.amount || 0);

              return (
                <div className="flex items-center justify-between py-1.5 text-xs text-slate-200 pl-1 border-b border-slate-800/40" key={s.id}>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={uName} size={24} />
                    <span className="font-bold text-white">{uName}</span>
                  </div>
                  <span className={`font-extrabold ${String(uId) === String(currentUser.id) ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {isPayer
                      ? `gets back ${currencySymbol}${(amount - splitAmt).toFixed(2)}`
                      : `owes ${currencySymbol}${splitAmt.toFixed(2)}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* DISCUSSION CHAT SECTION */}
      <div className="py-3 flex flex-col h-72 bg-slate-900/90 rounded-2xl p-4 border border-slate-800 my-4 text-xs">
        <div className="flex items-center gap-2 font-extrabold text-white pb-2.5 border-b border-slate-800">
          <MessageSquare className="h-4 w-4 text-emerald-400" />
          <span>Discussion Chat</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-2 space-y-3.5 pr-1">
          {chatMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
              <p className="text-slate-400 text-[11px] italic font-medium">No comments yet. Have a question or discrepancy? Post it here!</p>
            </div>
          ) : (
            chatMessages.map((msg) => {
              const isMe = msg.user_id === currentUser.id;
              const msgUser = msg.user?.name || 'User';
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <span className="text-[9px] text-slate-400 mb-0.5 font-bold">{msgUser}</span>
                  <div className={`p-2.5 rounded-2xl max-w-[85%] leading-relaxed ${
                    isMe 
                      ? 'bg-[#10b981] text-slate-950 font-bold rounded-tr-none' 
                      : 'bg-slate-800 border border-slate-700 text-white rounded-tl-none font-medium'
                  }`}>
                    <p>{msg.message}</p>
                  </div>
                  <span className="text-[8px] text-slate-400/80 mt-0.5 font-semibold">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={onSendMessage} className="flex gap-2 items-center mt-2 border-t border-slate-800 pt-2.5">
          <input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 bg-[#0f172a] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || chatLoading}
            className="p-2 bg-[#10b981] hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl cursor-pointer flex items-center justify-center transition-colors border-none"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>

      {/* Footer controls */}
      <div className="flex justify-end gap-3 pt-2 border-t border-slate-800 text-xs">
        <button
          onClick={onDelete}
          className="px-4 py-2 border border-red-900/60 bg-red-950/60 hover:bg-red-900/80 font-extrabold rounded-full text-red-300 cursor-pointer transition-all border-none"
        >
          Delete Expense
        </button>
      </div>
    </div>
  );
}

export default ExpenseDetail;
