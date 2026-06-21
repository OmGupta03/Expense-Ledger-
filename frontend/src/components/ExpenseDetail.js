import React from 'react';
import Avatar from './Avatar';
import { getCategoryIcon } from '../utils/categoryIcons';
import { Send, MessageSquare } from 'lucide-react';

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
  const currencySymbol = expense.currency === 'USD' ? '$' : '₹';

  return (
    <div className="expense-detail-card bg-white rounded-xl p-6 border border-border-custom shadow-xs relative text-left">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-text-muted hover:text-text-primary font-bold text-sm cursor-pointer"
      >
        ✕ Close
      </button>

      {/* Header */}
      <div className="expense-detail-header flex gap-4 items-start pb-5 border-b border-border-custom">
        <div className="expense-icon-lg text-4xl bg-grey-bg rounded-xl p-3 select-none flex-shrink-0">
          {getCategoryIcon(expense.description)}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-text-primary truncate">{expense.description}</h2>
          <p className="expense-amount-lg text-3xl font-extrabold text-text-primary mt-1">
            {currencySymbol}{amount.toFixed(2)}
          </p>
          <p className="expense-meta text-xs text-text-muted mt-1">
            {group.name || 'Flat'} · {formatDate(expense.created_at || expense.date)}
          </p>
          <p className="expense-meta text-xs text-text-muted mt-0.5">
            Added by <span className="font-medium">{payerName}</span>
          </p>
        </div>
      </div>

      {/* Splits List */}
      <div className="expense-splits py-4 space-y-3 border-b border-border-custom">
        <div className="paid-row flex items-center gap-3 py-1 text-sm text-text-primary">
          <Avatar name={payerName} size={32} />
          <span>
            <strong>{payerName}</strong> paid <strong>{currencySymbol}{amount.toFixed(2)}</strong>
          </span>
        </div>

        <div className="border-t border-border-custom pt-3 mt-3">
          <p className="text-[10px] uppercase font-bold text-text-muted tracking-wider mb-2">Split Breakdown</p>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {splits.map((s) => {
              const uId = s.user?.id || s.user_id;
              const uName = s.user?.name || 'User';
              const isPayer = String(uId) === String(payerId);
              const splitAmt = parseFloat(s.amount || 0);

              return (
                <div className="split-row flex items-center justify-between py-1 text-xs text-text-primary pl-2 border-b border-slate-50 pb-2" key={s.id}>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={uName} size={24} />
                    <span className="split-name font-medium">{uName}</span>
                  </div>
                  <span className={`font-semibold ${String(uId) === String(currentUser.id) ? 'text-green-pri' : 'text-slate-600'}`}>
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
      <div className="py-4 flex flex-col h-72 bg-slate-50/40 rounded-xl p-3 border border-slate-100 my-4 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-text-primary pb-2 border-b border-slate-100">
          <MessageSquare className="h-4 w-4 text-green-pri" />
          <span>Discussion Chat</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-2 space-y-3.5 pr-1">
          {chatMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
              <p className="text-text-muted text-[11px] italic">No comments yet. Have a question or discrepancy? Post it here!</p>
            </div>
          ) : (
            chatMessages.map((msg) => {
              const isMe = msg.user_id === currentUser.id;
              const msgUser = msg.user?.name || 'Deleted User';
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <span className="text-[9px] text-text-muted mb-0.5">{msgUser}</span>
                  <div className={`p-2.5 rounded-xl max-w-[85%] leading-relaxed ${
                    isMe 
                      ? 'bg-green-pri text-white rounded-tr-none' 
                      : 'bg-white border border-border-custom text-text-primary rounded-tl-none'
                  }`}>
                    <p>{msg.message}</p>
                  </div>
                  <span className="text-[8px] text-text-muted/70 mt-0.5">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={onSendMessage} className="flex gap-2 items-center mt-2 border-t border-slate-100 pt-2">
          <input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 bg-white border border-border-custom rounded-lg px-3 py-1.5 text-xs text-text-primary placeholder-slate-400 focus:outline-none focus:border-green-pri"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || chatLoading}
            className="p-2 bg-green-pri hover:bg-green-light disabled:opacity-50 text-white rounded-lg cursor-pointer flex items-center justify-center transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>

      {/* Footer controls */}
      <div className="flex justify-end gap-3 pt-3 border-t border-border-custom text-xs">
        <button
          onClick={onDelete}
          className="px-4 py-2 border border-border-custom hover:border-red-owe font-semibold rounded-lg text-red-owe cursor-pointer transition-colors"
        >
          Delete Expense
        </button>
      </div>
    </div>
  );
}

export default ExpenseDetail;
