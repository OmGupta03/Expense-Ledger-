'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  fetchGroupDetails,
  fetchGroupMembers,
  inviteUserToGroup,
  removeUserFromGroup,
  addExpense,
  deleteExpense,
  recordSettlement,
  fetchGroupExpenses,
  fetchGroupSettlements,
  calculateBalancesAndDebts,
  computeBalancesAndDebts,
  sendChatMessage,
  fetchExpenseChat,
  fetchExpenseDetails,
  deleteGroup
} from '@/lib/api';

import Avatar from '@/components/Avatar';
import PersonBalanceRow from '@/components/PersonBalanceRow';
import ExpenseRow from '@/components/ExpenseRow';
import ExpenseDetail from '@/components/ExpenseDetail';
import BalanceDrilldownModal from '@/components/BalanceDrilldownModal';
import { 
  ArrowLeft, 
  RefreshCw, 
  Trash2, 
  FileSpreadsheet, 
  UserPlus, 
  Info, 
  ChevronRight, 
  Plus,
  Utensils,
  Home,
  Plane,
  Clapperboard,
  MoreHorizontal,
  Search,
  HelpCircle,
  Settings,
  Check,
  Users,
  Download,
  Filter,
  Bell,
  Wallet,
  Landmark,
  UserX
} from 'lucide-react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import Header from '@/components/Header';
import SearchBar from '@/components/ui/SearchBar';


export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const groupId = params.id;
  const activeView = searchParams.get('tab') || 'expenses';

  const { user, profile, loading } = useAuth();

  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [balances, setBalances] = useState({ 
    netBalances: {}, 
    simplifiedDebts: [], 
    netBalancesByCurrency: { INR: {}, USD: {} }, 
    simplifiedDebtsByCurrency: { INR: [], USD: [] } 
  });
  const [pageLoading, setPageLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Drilldown Modal State
  const [drilldownMember, setDrilldownMember] = useState(null);

  // Edit / Add Member Modal States
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [memberError, setMemberError] = useState('');
  const [memberLoading, setMemberLoading] = useState(false);

  // Detailed Selected Expense (for Chat Discussion)
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef(null);

  // General Modals
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showSettlementModal, setShowSettlementModal] = useState(false);

  // Settlement Form State
  const [settlePayer, setSettlePayer] = useState('');
  const [settlePayee, setSettlePayee] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [settleCurrency, setSettleCurrency] = useState('INR');
  const [settlePaymentMethod, setSettlePaymentMethod] = useState('cash');
  const [settleNotes, setSettleNotes] = useState('');
  const [settleError, setSettleError] = useState('');
  const [settleLoading, setSettleLoading] = useState(false);

  // Expense Form State
  const [expDescription, setExpDescription] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expPayer, setExpPayer] = useState('');
  const [expCurrency, setExpCurrency] = useState('INR');
  const [expSplitType, setExpSplitType] = useState('equal'); // equal, unequal, percentage, share
  const [splitInputs, setSplitInputs] = useState({}); // userId -> value string
  const [splitCheckboxes, setSplitCheckboxes] = useState({}); // userId -> bool
  const [expenseError, setExpenseError] = useState('');
  const [expenseLoading, setExpenseLoading] = useState(false);

  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [expDate, setExpDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [splits, setSplits] = useState([]);

  // Smart Debt Settlement States
  const [payNowTarget, setPayNowTarget] = useState(null); // { member, amount, currency }
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [payNotes, setPayNotes] = useState('');
  const [reminderTarget, setReminderTarget] = useState(null); // { member, amount, currency }
  const [copiedText, setCopiedText] = useState(false);
  const [settlementLoading, setSettlementLoading] = useState(false);
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' }

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Toggle Add Expense view if ?action=add-expense query is present
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'add-expense') {
      setIsAddingExpense(true);
    }
  }, [searchParams]);

  // Auto-dismiss Toast notifications after 4 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const loadData = useCallback(async () => {
    if (!groupId || !user) return;
    setPageLoading(true);
    try {
      const g = await fetchGroupDetails(groupId);
      setGroup(g);
      
      const m = await fetchGroupMembers(groupId);
      setMembers(m);

      const expList = await fetchGroupExpenses(groupId);
      setExpenses(expList);

      const setList = await fetchGroupSettlements(groupId);
      setSettlements(setList);

      const expenseIds = expList.map((e) => e.id);
      let splitsList = [];
      if (expenseIds.length > 0) {
        const { data: splitsData, error: splitsErr } = await supabase
          .from('expense_splits')
          .select('user_id, amount, expense_id')
          .in('expense_id', expenseIds);
        if (splitsErr) throw splitsErr;
        splitsList = splitsData;
      }
      setSplits(splitsList);

      const balData = await calculateBalancesAndDebts(groupId);
      setBalances(balData);
    } catch (err) {
      console.error('Error loading group details:', err);
      router.push('/dashboard');
    } finally {
      setPageLoading(false);
    }
  }, [groupId, user, router]);

  useEffect(() => {
    if (groupId && user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadData();
    }
  }, [groupId, user, loadData]);

  // Realtime postgres changes channel for chat synchronization
  useEffect(() => {
    if (!selectedExpense) return;

    const getChat = async () => {
      try {
        const chats = await fetchExpenseChat(selectedExpense.id);
        setChatMessages(chats);
      } catch (err) {
        console.error('Error fetching chats:', err);
      }
    };
    getChat();

    const channel = supabase
      .channel(`chat_${selectedExpense.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `expense_id=eq.${selectedExpense.id}`,
        },
        async (payload) => {
          const { data: userMsg } = await supabase
            .from('users')
            .select('id, name, email')
            .eq('id', payload.new.user_id)
            .single();

          const messageWithUser = {
            ...payload.new,
            user: userMsg || { id: payload.new.user_id, name: 'Group Member' }
          };
          
          setChatMessages((prev) => [...prev, messageWithUser]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedExpense]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const openGenericExpenseModal = () => {
    if (user && members.length > 0) {
      setExpPayer(user.id);
      setExpDescription('');
      setExpAmount('');
      setExpSplitType('equal');
      setExpCurrency('INR');
      setExpenseError('');
      
      const defaultCheckboxes = {};
      const defaultInputs = {};
      members.forEach((m) => {
        defaultCheckboxes[m.id] = true;
        defaultInputs[m.id] = '';
      });
      setSplitCheckboxes(defaultCheckboxes);
      setSplitInputs(defaultInputs);
    }
    setIsAddingExpense(true);
  };

  const openGenericSettlementModal = () => {
    if (user && members.length > 0) {
      setSettlePayer(user.id);
      const alternative = members.find((m) => m.id !== user.id);
      setSettlePayee(alternative ? alternative.id : '');
      setSettleAmount('');
      setSettleCurrency('INR');
      setSettlePaymentMethod('cash');
      setSettleNotes('');
      setSettleError('');
    }
    setShowSettlementModal(true);
  };

  const handleDeleteGroup = async () => {
    const hasDebts = balances.simplifiedDebts && balances.simplifiedDebts.length > 0;
    if (hasDebts) {
      alert('Cannot delete group. There are outstanding debts that must be settled first.');
      return;
    }

    const confirmDelete = window.confirm(
      'Are you sure you want to delete this group? This will permanently delete all expenses, settlements, and member associations. This action cannot be undone.'
    );
    if (!confirmDelete) return;

    try {
      await deleteGroup(groupId);
      if (typeof window !== 'undefined' && localStorage.getItem('lastGroupId') === groupId) {
        localStorage.removeItem('lastGroupId');
      }
      router.push('/dashboard');
    } catch (err) {
      alert(err.message || 'Failed to delete group.');
    }
  };

  // Handlers
  const handleInviteMember = async (e) => {
    e.preventDefault();
    setMemberError('');
    if (!newMemberEmail.trim()) return;

    setMemberLoading(true);
    try {
      await inviteUserToGroup(groupId, newMemberEmail.trim());
      setNewMemberEmail('');
      setShowMemberForm(false);
      await loadData();
    } catch (err) {
      setMemberError(err.message || 'Failed to invite member');
    } finally {
      setMemberLoading(false);
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    const confirmRemove = window.confirm(`Are you sure you want to remove ${memberName} from this group?`);
    if (!confirmRemove) return;

    try {
      await removeUserFromGroup(groupId, memberId);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to remove member.');
    }
  };

  const handlePayNowConfirm = async (e) => {
    e.preventDefault();
    if (settlementLoading || !payNowTarget) return;

    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0 || !Number.isInteger(amt)) {
      setToast({ message: 'Amount must be a positive whole number.', type: 'error' });
      return;
    }
    if (amt > payNowTarget.debtAmount + 0.02) {
      setToast({ message: 'Amount cannot exceed the outstanding balance.', type: 'error' });
      return;
    }

    const prevSettlements = [...settlements];
    const prevBalances = { ...balances };

    setSettlementLoading(true);
    setToast(null);

    const targetMember = payNowTarget.member;
    const isMePayer = payNowTarget.isMePayer;
    const payerId = isMePayer ? user.id : targetMember.id;
    const payeeId = isMePayer ? targetMember.id : user.id;

    const optSettlement = {
      id: `temp-${Date.now()}`,
      group_id: groupId,
      payer_id: payerId,
      payee_id: payeeId,
      amount: amt,
      currency: payNowTarget.currency,
      payment_method: payMethod,
      notes: payNotes,
      status: amt === payNowTarget.debtAmount ? 'completed' : 'partial',
      created_at: new Date().toISOString(),
      payer: members.find(m => m.id === payerId),
      payee: members.find(m => m.id === payeeId)
    };

    const optSettlementsList = [optSettlement, ...settlements];
    const optBalances = computeBalancesAndDebts(members, expenses, splits, optSettlementsList);

    setSettlements(optSettlementsList);
    setBalances(optBalances);
    setPayNowTarget(null);

    try {
      await recordSettlement(
        groupId,
        payerId,
        payeeId,
        amt,
        payNowTarget.currency,
        payMethod,
        payNotes,
        optSettlement.status
      );

      setToast({ message: 'Payment recorded successfully!', type: 'success' });
      await loadData();
    } catch (err) {
      console.error('Settlement insertion failed, rolling back:', err);
      setSettlements(prevSettlements);
      setBalances(prevBalances);
      setToast({ message: err.message || 'Failed to record settlement. Rolled back.', type: 'error' });
    } finally {
      setSettlementLoading(false);
    }
  };

  const handleOpenReminder = (member, amount, currency) => {
    const currencySymbol = currency === 'USD' ? '$' : '₹';
    const message = `Hi ${member.name}, just a friendly reminder that you owe me ${currencySymbol}${amount.toFixed(2)} in our group "${group.name}". Thanks!`;
    setReminderTarget({ member, amount, currency, message });
    setCopiedText(false);
  };

  const handleCopyReminder = () => {
    if (!reminderTarget) return;
    navigator.clipboard.writeText(reminderTarget.message);
    setCopiedText(true);
    setToast({ message: 'Reminder copied to clipboard!', type: 'success' });
  };

  const handleRecordSettlement = async (e) => {
    e.preventDefault();
    setSettleError('');

    if (!settlePayer || !settlePayee || !settleAmount) {
      setSettleError('All fields are required');
      return;
    }
    if (settlePayer === settlePayee) {
      setSettleError('Payer and recipient cannot be the same person.');
      return;
    }
    const amt = parseFloat(settleAmount);
    if (isNaN(amt) || amt <= 0 || !Number.isInteger(amt)) {
      setSettleError('Amount must be a positive whole number');
      return;
    }

    setSettleLoading(true);
    try {
      await recordSettlement(groupId, settlePayer, settlePayee, amt, settleCurrency, settlePaymentMethod, settleNotes);
      setShowSettlementModal(false);
      await loadData();
    } catch (err) {
      setSettleError(err.message || 'Failed to record settlement.');
    } finally {
      setSettleLoading(false);
    }
  };

  const handleQuickSettlement = (fromId, toId, amount, currency) => {
    setSettlePayer(fromId);
    setSettlePayee(toId);
    setSettleAmount(amount);
    setSettleCurrency(currency || 'INR');
    setSettleError('');
    setShowSettlementModal(true);
  };

  const handleDeleteExpense = async (expenseId) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this expense? All associated splits will be reverted.');
    if (!confirmDelete) return;

    try {
      await deleteExpense(expenseId);
      setSelectedExpense(null);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete expense.');
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setExpenseError('');

    if (!expDescription.trim()) {
      setExpenseError('Description is required');
      return;
    }
    const totalAmt = parseFloat(expAmount);
    if (isNaN(totalAmt) || totalAmt <= 0 || !Number.isInteger(totalAmt)) {
      setExpenseError('Total amount must be a positive whole number');
      return;
    }

    const splits = [];

    if (expSplitType === 'equal') {
      const activeIds = Object.keys(splitCheckboxes).filter((uid) => splitCheckboxes[uid]);
      if (activeIds.length === 0) {
        setExpenseError('At least one member must participate in the split');
        return;
      }
      const splitAmt = Math.round((totalAmt / activeIds.length) * 100) / 100;
      let calculatedSum = 0;

      activeIds.forEach((uid, index) => {
        const finalAmt = index === activeIds.length - 1 ? (totalAmt - calculatedSum) : splitAmt;
        calculatedSum += finalAmt;

        splits.push({
          userId: uid,
          amount: Math.round(finalAmt * 100) / 100
        });
      });
    } 
    
    else if (expSplitType === 'unequal') {
      let sum = 0;
      for (const m of members) {
        const val = parseFloat(splitInputs[m.id] || 0);
        if (isNaN(val) || val < 0) {
          setExpenseError(`Invalid split amount for member ${m.name}`);
          return;
        }
        sum += val;
        splits.push({
          userId: m.id,
          amount: Math.round(val * 100) / 100
        });
      }

      if (Math.abs(sum - totalAmt) > 0.02) {
        setExpenseError(`Unequal splits sum to ${currencySymbol}${sum.toFixed(2)}, but total expense is ${currencySymbol}${totalAmt.toFixed(2)}. Difference must be 0.`);
        return;
      }
    } 
    
    else if (expSplitType === 'percentage') {
      let percentSum = 0;
      for (const m of members) {
        const pct = parseFloat(splitInputs[m.id] || 0);
        if (isNaN(pct) || pct < 0 || pct > 100) {
          setExpenseError(`Invalid percentage for member ${m.name}`);
          return;
        }
        percentSum += pct;
      }

      if (Math.abs(percentSum - 100) > 0.01) {
        setExpenseError(`Percentages must sum to exactly 100% (currently ${percentSum.toFixed(1)}%).`);
        return;
      }

      let calculatedSum = 0;
      members.forEach((m, index) => {
        const pct = parseFloat(splitInputs[m.id] || 0);
        const splitAmt = index === members.length - 1 
          ? (totalAmt - calculatedSum) 
          : (totalAmt * pct) / 100;
        
        calculatedSum += Math.round(splitAmt * 100) / 100;

        splits.push({
          userId: m.id,
          amount: Math.round(splitAmt * 100) / 100,
          percentage: pct
        });
      });
    } 
    
    else if (expSplitType === 'share') {
      let totalShares = 0;
      for (const m of members) {
        const sh = parseFloat(splitInputs[m.id] || 0);
        if (isNaN(sh) || sh < 0) {
          setExpenseError(`Invalid share count for member ${m.name}`);
          return;
        }
        totalShares += sh;
      }

      if (totalShares <= 0) {
        setExpenseError('Total shares must be greater than 0');
        return;
      }

      let calculatedSum = 0;
      members.forEach((m, index) => {
        const sh = parseFloat(splitInputs[m.id] || 0);
        const splitAmt = index === members.length - 1
          ? (totalAmt - calculatedSum)
          : (totalAmt * sh) / totalShares;

        calculatedSum += Math.round(splitAmt * 100) / 100;

        splits.push({
          userId: m.id,
          amount: Math.round(splitAmt * 100) / 100,
          share: sh
        });
      });
    }

    setExpenseLoading(true);
    try {
      const finalDescription = expDescription.trim();
      await addExpense(groupId, expPayer, finalDescription, totalAmt, expSplitType, splits, expCurrency, expDate);
      setShowExpenseModal(false);
      setIsAddingExpense(false);
      setExpDescription('');
      setExpAmount('');
      if (searchParams.get('action') === 'add-expense') {
        router.push(`/groups/${groupId}?tab=expenses`);
      }
      await loadData();
    } catch (err) {
      setExpenseError(err.message || 'Failed to add expense.');
    } finally {
      setExpenseLoading(false);
    }
  };

  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || chatLoading) return;

    setChatLoading(true);
    try {
      await sendChatMessage(selectedExpense.id, user.id, newMessage.trim());
      setNewMessage('');
    } catch (err) {
      console.error('Error posting message:', err);
    } finally {
      setChatLoading(false);
    }
  };

  const handleOpenExpenseDetails = async (expense) => {
    try {
      const details = await fetchExpenseDetails(expense.id);
      setSelectedExpense(details);
    } catch (err) {
      console.error('Failed to load expense details:', err);
    }
  };

  const handleCheckboxChange = (userId) => {
    setSplitCheckboxes(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleSplitInputsChange = (userId, value) => {
    setSplitInputs(prev => ({
      ...prev,
      [userId]: value
    }));
  };

  // month-grouping timeline helper
  const groupExpensesByMonth = (expensesList) => {
    const groups = {};
    const sorted = [...expensesList].sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date));
    sorted.forEach((exp) => {
      const d = new Date(exp.created_at || exp.date);
      if (isNaN(d.getTime())) {
        const key = 'Other Dates';
        if (!groups[key]) groups[key] = [];
        groups[key].push(exp);
        return;
      }
      const monthName = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (!groups[monthName]) groups[monthName] = [];
      groups[monthName].push(exp);
    });
    return groups;
  };

  if (loading || !user || (pageLoading && !group)) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading group ledger...</p>
      </div>
    );
  }

  const filteredExpenses = expenses.filter(exp => {
    if (!searchQuery) return true;
    const desc = exp.description || '';
    const payerName = exp.payer?.name || '';
    return desc.toLowerCase().includes(searchQuery.toLowerCase()) || 
           payerName.toLowerCase().includes(searchQuery.toLowerCase());
  });
  const groupedExpenses = groupExpensesByMonth(filteredExpenses);
  const currencySymbol = expCurrency === 'USD' ? '$' : '₹';
  const myNetINR = balances.netBalancesByCurrency?.INR?.[user.id] || 0;
  const myNetUSD = balances.netBalancesByCurrency?.USD?.[user.id] || 0;

  const toastElement = toast && (
    <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-bold transition-all flex items-center gap-2 ${
      toast.type === 'success' 
        ? 'bg-[#e8f5e9] border-[#c8e6c9] text-[#2e7d32]' 
        : 'bg-red-50 border-red-200 text-red-owe'
    }`}>
      <span>{toast.type === 'success' ? '🟢' : '🔴'}</span>
      <span>{toast.message}</span>
      <button onClick={() => setToast(null)} className="ml-2 font-bold hover:opacity-75 cursor-pointer bg-transparent border-none text-[10px] text-gray-500">✕</button>
    </div>
  );

  const modalsElement = (
    <>
      {payNowTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl text-left relative">
            <h3 className="text-base font-extrabold text-gray-900 border-b border-border-custom pb-3 mb-4">
              Record Payment to {payNowTarget.member.name}
            </h3>
            
            <form onSubmit={handlePayNowConfirm} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-text-muted mb-1">
                  Outstanding Debt
                </label>
                <p className="text-lg font-bold text-gray-900">
                  {payNowTarget.currency === 'USD' ? '$' : '₹'}{payNowTarget.debtAmount.toFixed(2)}
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-text-muted mb-1">
                  Payment Amount (Partial or Full)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                    {payNowTarget.currency === 'USD' ? '$' : '₹'}
                  </span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#fafafa] border border-border-custom rounded-xl pl-8 pr-3.5 py-2.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-green-pri font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-text-muted mb-1">
                  Payment Method
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full bg-[#fafafa] border border-border-custom rounded-xl px-3.5 py-2.5 text-xs text-text-primary focus:outline-none focus:border-green-pri"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-text-muted mb-1">
                  Optional Notes
                </label>
                <textarea
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Add payment context (e.g. sent via GPay)"
                  rows={2}
                  className="w-full bg-[#fafafa] border border-border-custom rounded-xl px-3.5 py-2.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-green-pri"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayNowTarget(null)}
                  className="px-4 py-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-grey-bg text-xs font-semibold transition-all cursor-pointer bg-transparent border-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settlementLoading}
                  className="px-4 py-2 bg-[#0e5c3e] hover:bg-[#0b4a32] text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer border-none disabled:opacity-50 flex items-center gap-1.5"
                >
                  {settlementLoading ? 'Saving...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {reminderTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl text-left relative">
            <h3 className="text-base font-extrabold text-gray-900 border-b border-border-custom pb-3 mb-4">
              Send Reminder to {reminderTarget.member.name}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-text-muted mb-1">
                  Polite Message
                </label>
                <textarea
                  readOnly
                  value={reminderTarget.message}
                  rows={3}
                  className="w-full bg-[#fafafa] border border-border-custom rounded-xl px-3.5 py-2.5 text-xs text-text-muted focus:outline-none resize-none font-medium leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleCopyReminder}
                  className="py-2.5 bg-[#e8f5e9] hover:bg-[#c8e6c9] text-[#2e7d32] font-bold rounded-xl text-xs transition-all cursor-pointer border-none flex items-center justify-center gap-1.5"
                >
                  <span>📋</span>
                  <span>{copiedText ? 'Copied!' : 'Copy Text'}</span>
                </button>
                
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(reminderTarget.message)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 bg-[#25d366] hover:bg-[#20ba5a] text-white font-bold rounded-xl text-xs transition-all cursor-pointer border-none flex items-center justify-center gap-1.5 text-center no-underline"
                >
                  <span>💬</span>
                  <span>WhatsApp</span>
                </a>
              </div>

              <div className="pt-2">
                <a
                  href={`mailto:?subject=${encodeURIComponent('Payment Reminder: ' + group.name)}&body=${encodeURIComponent(reminderTarget.message)}`}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-gray-750 font-bold rounded-xl text-xs transition-all cursor-pointer border-none flex items-center justify-center gap-1.5 text-center no-underline"
                >
                  <span>✉️</span>
                  <span>Share via Email</span>
                </a>
              </div>

              <div className="flex justify-end pt-2 border-t border-border-custom">
                <button
                  onClick={() => setReminderTarget(null)}
                  className="px-4 py-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-grey-bg text-xs font-semibold transition-all cursor-pointer bg-transparent border-none"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // Redesigned Add New Expense View
  if (isAddingExpense) {
    return (
      <Layout>
        {toastElement}
        {modalsElement}
        <div className="w-full flex-1 flex flex-col bg-[#f8fafc] overflow-hidden h-full font-sans">
          {/* Top Header Bar */}
          <Header
            leftSection={
              <div className="flex items-center gap-3 text-left">
                <button
                  onClick={() => {
                    setIsAddingExpense(false);
                    if (searchParams.get('action') === 'add-expense') {
                      router.push(`/groups/${groupId}?tab=expenses`);
                    }
                  }}
                  className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-gray-100 transition-colors cursor-pointer border-none bg-transparent"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="text-lg font-extrabold text-gray-900 tracking-tight">Add New Expense</h1>
              </div>
            }
          >
            <button
              onClick={loadData}
              disabled={pageLoading}
              className="p-1.5 rounded-full text-text-muted hover:text-text-primary hover:bg-gray-100 transition-all cursor-pointer border-none bg-transparent"
              title="Refresh balances"
            >
              <RefreshCw className={`h-4.5 w-4.5 ${pageLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowMemberForm(true)}
              className="px-5 py-1.5 bg-[#0e5c3e] hover:bg-[#0b4a32] text-white text-xs font-bold rounded-full transition-all cursor-pointer border-none shadow-xs"
            >
              Invite Member
            </button>
          </Header>

          {/* Form Content body container */}
          <div className="page-body flex-1 overflow-y-auto px-8 py-8">
            {expenseError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-owe p-3.5 rounded-2xl text-xs font-semibold text-left max-w-5xl mx-auto">
                {expenseError}
              </div>
            )}
            
            <form onSubmit={handleAddExpense} className="max-w-5xl mx-auto flex flex-col md:flex-row gap-6">
              
              {/* Left Form Box (Expense Info and Who Paid) */}
              <div className="flex-grow flex flex-col gap-6">
                
                {/* Expense Information Box */}
                <div className="bg-white border border-border-custom rounded-2xl p-6 text-left space-y-4">
                  <div className="flex items-center gap-2 text-text-muted">
                    <Info className="h-4.5 w-4.5 text-green-pri" />
                    <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Expense Information</span>
                  </div>
                  
                  {/* Description input */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Description</label>
                    <input
                      type="text"
                      required
                      value={expDescription}
                      onChange={(e) => setExpDescription(e.target.value)}
                      placeholder="What was this for? (e.g. Weekly Groceries)"
                      className="w-full bg-[#fafafa] border border-border-custom rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-green-pri focus:bg-white transition-all text-left"
                    />
                  </div>

                  {/* Amount and Date Input */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Amount</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-text-muted font-semibold text-sm">
                          {expCurrency === 'USD' ? '$' : '₹'}
                        </span>
                        <input
                          type="number"
                          step="1"
                          min="1"
                          required
                          value={expAmount}
                          onChange={(e) => setExpAmount(e.target.value)}
                          placeholder="0"
                          className="w-full pl-9 pr-4 py-3 bg-[#fafafa] border border-border-custom rounded-xl text-sm font-semibold text-text-primary focus:outline-none focus:border-green-pri focus:bg-white transition-all text-left"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date</label>
                        {expDate && !isNaN(new Date(expDate + 'T00:00:00').getTime()) && (
                          <span className="text-[10px] font-extrabold text-[#0e5c3e] bg-green-50 px-2 py-0.5 rounded-full border border-green-pri/20">
                            {new Date(expDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                      <input
                        type="date"
                        required
                        value={expDate}
                        onChange={(e) => setExpDate(e.target.value)}
                        className="w-full px-4 py-3 bg-[#fafafa] border border-border-custom rounded-xl text-sm text-text-primary focus:outline-none focus:border-green-pri focus:bg-white transition-all text-left"
                      />
                    </div>
                  </div>


                </div>

                {/* Who Paid Section */}
                <div className="bg-white border border-border-custom rounded-2xl p-6 text-left space-y-4">
                  <div className="flex items-center gap-2 text-text-muted">
                    <Users className="h-4.5 w-4.5 text-green-pri" />
                    <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Who paid?</span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4">
                    {members.map((m) => {
                      const isSelected = String(expPayer) === String(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setExpPayer(m.id)}
                          className="flex flex-col items-center gap-1.5 focus:outline-none cursor-pointer border-none bg-transparent"
                        >
                          <div className={`h-11 w-11 rounded-full flex items-center justify-center text-xs font-bold text-white transition-all ${
                            isSelected 
                              ? 'ring-2 ring-[#2e7d32] opacity-100 scale-105 shadow-sm' 
                              : 'opacity-45 hover:opacity-75'
                          }`}
                          style={{
                            backgroundColor: ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c'][m.name.charCodeAt(0) % 6]
                          }}>
                            {m.name[0].toUpperCase()}
                          </div>
                          <span className={`text-[10px] font-bold ${isSelected ? 'text-gray-900 font-extrabold' : 'text-gray-400'}`}>
                            {m.id === user.id ? 'You' : m.name.split(' ')[0]}
                          </span>
                        </button>
                      );
                    })}
                    
                    <button
                      type="button"
                      onClick={() => setShowMemberForm(true)}
                      className="h-11 w-11 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors cursor-pointer bg-white"
                      title="Add Payer/Member"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                </div>

              </div>

              {/* Right Sidebar split configuration */}
              <div className="w-full md:w-96 flex flex-col gap-6 flex-shrink-0">
                
                {/* Split Configuration Card */}
                <div className="bg-white border border-border-custom rounded-2xl p-6 text-left space-y-4">
                  <div className="flex items-center gap-2 text-text-muted">
                    <svg className="h-4.5 w-4.5 text-green-pri" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Split Configuration</span>
                  </div>

                  {/* Split Method Selector Tabs */}
                  <div className="flex bg-gray-100 p-1 rounded-full border border-gray-200">
                    {[
                      { id: 'equal', label: 'Equally' },
                      { id: 'unequal', label: 'Exact' },
                      { id: 'percentage', label: '%' },
                    ].map((tab) => {
                      const isActive = expSplitType === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setExpSplitType(tab.id)}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer border-none bg-transparent ${
                            isActive
                              ? 'bg-[#0e5c3e] text-white shadow-xs'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Split members checklist */}
                  <div className="space-y-3 pt-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select members to split with:</p>
                    
                    {/* Master Checkbox */}
                    {expSplitType === 'equal' && (
                      <div className="flex items-center justify-between bg-gray-50 border border-gray-200 p-3 rounded-xl">
                        <label className="flex items-center gap-2.5 text-xs font-bold text-gray-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={members.every(m => splitCheckboxes[m.id])}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const updated = {};
                              members.forEach(m => { updated[m.id] = checked; });
                              setSplitCheckboxes(updated);
                            }}
                            className="rounded border-gray-300 text-[#0e5c3e] focus:ring-[#0e5c3e] h-4 w-4"
                          />
                          <span>Everyone (All {members.length})</span>
                        </label>
                        
                        {/* Calculate equal split amount */}
                        {parseFloat(expAmount) > 0 && (() => {
                          const activeCount = Object.values(splitCheckboxes).filter(Boolean).length;
                          const amt = activeCount > 0 ? (parseFloat(expAmount) / activeCount) : 0;
                          return (
                            <span className="text-xs font-black text-[#0e5c3e]">
                              {expCurrency === 'USD' ? '$' : '₹'}{amt.toFixed(2)} ea
                            </span>
                          );
                        })()}
                      </div>
                    )}

                    {/* Individual checklist */}
                    <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                      {members.map((m) => {
                        const isChecked = !!splitCheckboxes[m.id];
                        let valText = '';
                        
                        if (expSplitType === 'equal') {
                          if (isChecked && parseFloat(expAmount) > 0) {
                            const activeCount = Object.values(splitCheckboxes).filter(Boolean).length;
                            valText = `${expCurrency === 'USD' ? '$' : '₹'}${(parseFloat(expAmount) / activeCount).toFixed(2)}`;
                          }
                          return (
                            <div key={m.id} className="flex items-center justify-between text-xs py-1">
                              <label className="flex items-center gap-2.5 text-gray-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleCheckboxChange(m.id)}
                                  className="rounded border-gray-300 text-[#0e5c3e] focus:ring-[#0e5c3e] h-4 w-4"
                                />
                                <span className="font-semibold">{m.name} {m.id === user.id && '(Primary)'}</span>
                              </label>
                              <span className="text-gray-500 font-semibold">{valText}</span>
                            </div>
                          );
                        }

                        // For exact and percentages, show input fields
                        let prefixSuffix = expSplitType === 'percentage' ? '%' : (expCurrency === 'USD' ? '$' : '₹');
                        return (
                          <div key={m.id} className="flex items-center justify-between text-xs py-0.5">
                            <span className="font-semibold text-gray-700">{m.name} {m.id === user.id && '(Primary)'}</span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                step="1"
                                min="0"
                                value={splitInputs[m.id] || ''}
                                onChange={(e) => handleSplitInputsChange(m.id, e.target.value)}
                                placeholder="0"
                                className="bg-[#fafafa] border border-border-custom rounded-lg px-2 py-1 text-xs text-right w-20 text-text-primary focus:outline-none focus:border-green-pri"
                              />
                              <span className="text-[10px] font-bold text-gray-400">{prefixSuffix}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Total to Split box */}
                <div className="bg-[#e8f5e9]/55 border border-[#c8e6c9]/45 rounded-xl p-4 flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-600">Total to Split</span>
                  <span className="text-base font-black text-[#2e7d32]">
                    {expCurrency === 'USD' ? '$' : '₹'}{parseFloat(expAmount || 0).toFixed(2)}
                  </span>
                </div>

                {/* Submit and Cancel Buttons */}
                <div className="flex flex-col gap-3">
                  <button
                    type="submit"
                    disabled={expenseLoading}
                    className="w-full py-3 bg-[#0e5c3e] hover:bg-[#0b4a32] text-white font-bold rounded-full shadow-md hover:shadow-lg transition-all cursor-pointer text-sm flex items-center justify-center gap-2 border-none"
                  >
                    {expenseLoading ? (
                      <span>Saving...</span>
                    ) : (
                      <>
                        <Check className="h-4.5 w-4.5" />
                        <span>Save Expense</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingExpense(false);
                      if (searchParams.get('action') === 'add-expense') {
                        router.push(`/groups/${groupId}?tab=expenses`);
                      }
                    }}
                    className="text-gray-500 hover:text-gray-700 text-xs font-semibold py-1 bg-transparent border-none cursor-pointer"
                  >
                    Cancel Entry
                  </button>
                </div>

              </div>

            </form>
          </div>
        </div>
      </Layout>
    );
  }

  // Redesigned Members Management View
  if (activeView === 'members') {
    return (
      <Layout>
        {toastElement}
        {modalsElement}
        <div className="w-full flex-1 flex flex-col bg-[#f8fafc] overflow-hidden h-full font-sans">
          {/* Top Header Bar */}
          <Header
            placeholder="Search members or activity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          >
            <button
              className="p-1.5 rounded-full text-text-muted hover:text-text-primary hover:bg-gray-100 transition-all cursor-pointer border-none bg-transparent"
              title="Help"
            >
              <HelpCircle className="h-4.5 w-4.5" />
            </button>

            <button
              onClick={() => setIsAddingExpense(true)}
              className="px-4 py-1.5 bg-[#0e5c3e] hover:bg-[#0b4a32] text-white text-xs font-bold rounded-full transition-all cursor-pointer border-none shadow-xs"
            >
              Add Entry
            </button>
          </Header>

          {/* Members Content container */}
          <div className="page-body flex-1 overflow-y-auto px-8 py-8 space-y-6 text-left">
            
            {/* Breadcrumbs and Title row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold text-text-muted">
                  Groups &gt; <span className="font-bold text-[#0e5c3e] cursor-pointer" onClick={() => router.push(`/groups/${groupId}?tab=expenses`)}>{group.name}</span>
                </p>
                <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight mt-1.5">Members Management</h1>
                <p className="text-xs text-text-muted mt-1 font-semibold">
                  Organize your roommates and manage contribution permissions.
                </p>
              </div>

              <button
                onClick={() => setShowMemberForm(!showMemberForm)}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#0e5c3e] hover:bg-[#0b4a32] text-white shadow-sm font-extrabold text-xs rounded-full transition-all cursor-pointer border-none"
              >
                <UserPlus className="h-4 w-4" />
                <span>Invite Member</span>
              </button>
            </div>

            {/* Invite Form (inline dropdown) */}
            {showMemberForm && (
              <div className="bg-white border border-border-custom rounded-2xl p-5 shadow-xs text-left max-w-md">
                <h3 className="font-bold text-sm text-text-primary mb-1">Invite New Flatmate</h3>
                <p className="text-xs text-text-muted mb-4">Send an invitation to join this shared ledger.</p>
                {memberError && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-owe p-3 rounded-lg text-xs font-semibold">
                    {memberError}
                  </div>
                )}
                <form onSubmit={handleInviteMember} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-text-muted mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      placeholder="e.g. flatmate@example.com"
                      className="w-full bg-[#fafafa] border border-border-custom rounded-xl px-3.5 py-2.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-green-pri"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowMemberForm(false);
                        setNewMemberEmail('');
                        setMemberError('');
                      }}
                      className="px-4 py-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-grey-bg text-xs font-semibold transition-all cursor-pointer bg-transparent border-none"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={memberLoading}
                      className="px-4 py-2 bg-[#0e5c3e] hover:bg-[#0b4a32] text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer border-none disabled:opacity-50"
                    >
                      {memberLoading ? 'Sending...' : 'Invite Flatmate'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Members summary stats grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              
              {/* Total Members Card */}
              <div className="bg-white border border-border-custom rounded-2xl p-5 shadow-xs flex items-center gap-4 text-left max-w-xs">
                <div className="h-12 w-12 rounded-xl bg-[#e8f5e9] flex items-center justify-center text-[#2e7d32] flex-shrink-0">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Members</p>
                  <p className="text-3xl font-extrabold text-gray-900 mt-1">
                    {members.length < 10 ? `0${members.length}` : members.length}
                  </p>
                </div>
              </div>

            </div>

            {/* Filter and Table container */}
            <div className="bg-white border border-border-custom rounded-2xl overflow-hidden shadow-xs">
              
              {/* Table search & action filters bar */}
              <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative w-80 text-left">
                  <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                    <Search className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Filter by name, email, or role..."
                    className="w-full pl-9 pr-4 py-1.5 bg-[#f1f5f9] border border-transparent rounded-full text-xs text-text-primary placeholder-gray-400 focus:outline-none focus:bg-white focus:border-gray-300 transition-all text-left"
                  />
                </div>

                <div className="flex gap-2">
                  <button className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg text-xs font-semibold transition-all cursor-pointer bg-white">
                    <Filter className="h-3.5 w-3.5 text-gray-400" />
                    <span>Filter</span>
                  </button>
                  <button className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg text-xs font-semibold transition-all cursor-pointer bg-white">
                    <Download className="h-3.5 w-3.5 text-gray-400" />
                    <span>Export</span>
                  </button>
                </div>
              </div>

              {/* Members Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100 text-left text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                      <th className="px-6 py-3.5">Member</th>
                      <th className="px-6 py-3.5">Email Address</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-left text-xs">
                    {members.map((m, index) => {
                      // Determine status and avatar
                      let statusText = "Active";
                      let statusDotColor = "bg-[#15803d]";
                      let statusTextColor = "text-[#15803d]";
                      
                      // Mock some offline/invited states to make it match mockup visually
                      if (index === 2) {
                        statusText = "Offline";
                        statusDotColor = "bg-gray-400";
                        statusTextColor = "text-gray-500";
                      } else if (index === 3) {
                        statusText = "Invited";
                        statusDotColor = "bg-mint-green";
                        statusTextColor = "text-[#2e7d32]";
                      }

                      // Dummy dates to match mockup
                      const addedDates = ["12 Jan 2024", "15 Jan 2024", "02 Feb 2024", "Sent 2 hours ago"];
                      const addedDate = addedDates[index % addedDates.length];

                      return (
                        <tr key={m.id} className="hover:bg-gray-50/40 transition-colors">
                          {/* Member column */}
                          <td className="px-6 py-4 flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase select-none"
                            style={{
                              backgroundColor: ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c'][m.name.charCodeAt(0) % 6]
                            }}>
                              {m.name[0]}
                            </div>
                            <div>
                              <p className="font-extrabold text-gray-900 text-sm leading-none">{m.name}</p>
                              <p className="text-[10px] text-gray-400 mt-1 leading-none">
                                {statusText === "Invited" ? `Sent ${addedDate}` : `Added ${addedDate}`}
                              </p>
                            </div>
                          </td>

                          {/* Email column */}
                          <td className="px-6 py-4 text-gray-600 font-semibold">
                            {m.email || 'N/A'}
                          </td>

                          {/* Status column */}
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 font-bold ${statusTextColor}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${statusDotColor}`}></span>
                              <span>{statusText}</span>
                            </span>
                          </td>

                          {/* Actions column */}
                          <td className="px-6 py-4 text-right">
                            {statusText === "Invited" && (
                              <button className="px-3 py-1 bg-white hover:bg-green-50/10 border border-green-pri/30 text-[#0e5c3e] rounded-lg font-bold text-[10px] tracking-wide transition-all cursor-pointer">
                                Resend
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

            </div>

          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {toastElement}
      {modalsElement}
      <div className="w-full flex-1 flex flex-col bg-[#f8fafc] overflow-hidden h-full">
        <Header
          leftSection={
            <div className="flex items-center space-x-4">
              <div className="text-left">
                <h1 className="text-xl font-extrabold text-gray-900 tracking-tight leading-none">{group.name}</h1>
                <p className="text-[10px] text-text-muted mt-1 leading-none font-semibold">Ledger details and balances</p>
              </div>
            </div>
          }
          centerSection={
            <SearchBar 
              value={searchQuery} 
              onChange={setSearchQuery} 
              placeholder="Search expenses..." 
              className="w-full"
            />
          }
        >
          <button
            onClick={loadData}
            disabled={pageLoading}
            className="p-1.5 rounded-full text-text-muted hover:text-text-primary hover:bg-gray-100 transition-all cursor-pointer bg-transparent border-none"
            title="Refresh ledger"
          >
            <RefreshCw className={`h-4 w-4 ${pageLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleDeleteGroup}
            className="flex items-center gap-1.5 px-4 py-2 border border-red-200 hover:border-red-400 hover:bg-red-50/50 text-red-500 rounded-lg text-xs font-bold transition-all cursor-pointer bg-white"
            title="Delete this group"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete Group</span>
          </button>
        </Header>

        {/* Main Body Grid */}
        <div className="page-body overflow-y-auto flex-1">
        
        {/* Two column layout */}
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Left Column (w-full md:w-80 or centered max-w-xl based on activeView) */}
          <aside className={(activeView === 'expenses' || activeView === 'settlements') ? "w-full md:w-80 flex-shrink-0 flex flex-col gap-6" : "w-full max-w-xl mx-auto flex flex-col gap-6"}>
            
            {/* 1. MY GROUP BALANCE card */}
            {activeView === 'expenses' && (
              <>
                <div className="bg-white border border-border-custom rounded-3xl p-6 shadow-sm text-left relative overflow-hidden">
                  <div className="absolute top-[-25px] right-[-25px] w-20 h-20 rounded-full bg-gradient-to-br from-green-50/50 to-green-100/30 border border-green-100/20 pointer-events-none"></div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                    <Landmark className="h-3.5 w-3.5 text-gray-400" />
                    <span>My Group Balance</span>
                  </div>
                  
                  <div className="flex flex-col gap-4 mt-4">
                    <div>
                      <div className={`text-2xl font-extrabold tracking-tight ${
                        myNetINR > 0.01 
                          ? 'text-green-owed' 
                          : myNetINR < -0.01 
                          ? 'text-red-owe' 
                          : 'text-text-primary'
                      }`}>
                        {myNetINR > 0.01 ? '+' : ''}
                        ₹{myNetINR.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
                        Indian Rupee (INR)
                      </div>
                    </div>
                    
                    <div>
                      <div className={`text-2xl font-extrabold tracking-tight ${
                        myNetUSD > 0.01 
                          ? 'text-green-owed' 
                          : myNetUSD < -0.01 
                          ? 'text-red-owe' 
                          : 'text-text-primary'
                      }`}>
                        {myNetUSD > 0.01 ? '+' : ''}
                        ${myNetUSD.toFixed(2)}
                      </div>
                      <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
                        US Dollar (USD)
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={openGenericSettlementModal}
                    className="w-full mt-5 py-2.5 bg-[#0e5c3e] hover:bg-[#0b4a32] text-white font-extrabold rounded-xl text-xs transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 border-none"
                  >
                    <Wallet className="h-4 w-4" />
                    <span>Record Settle Up</span>
                  </button>
                </div>

                {/* Pending Balances Card */}
                <div className="bg-white border border-border-custom rounded-3xl p-6 shadow-sm text-left mt-6">
                  <div className="flex items-center gap-1.5 pb-3 border-b border-border-custom mb-4">
                    <Users className="h-4 w-4 text-gray-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">Pending Balances</h3>
                  </div>
                  <div className="space-y-4">
                    {members.filter(m => m.id !== user?.id).length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-6 text-center">
                        <div className="h-12 w-12 rounded-full bg-slate-100/80 flex items-center justify-center text-gray-400 mb-2.5 border border-dashed border-gray-300">
                          <UserX className="h-5 w-5" />
                        </div>
                        <p className="text-xs text-gray-500 font-semibold">No flatmates added yet.</p>
                        <button 
                          onClick={() => setShowMemberForm(true)} 
                          className="text-xs font-bold text-green-pri hover:text-green-light mt-1.5 bg-transparent border-none cursor-pointer hover:underline"
                        >
                          Invite Friends
                        </button>
                      </div>
                    ) : (
                      members.filter(m => m.id !== user?.id).map(m => {
                        // Find active simplified debts for this member with user
                        const activeDebts = balances.simplifiedDebts.filter(d => 
                          (d.from === user?.id && d.to === m.id) || (d.from === m.id && d.to === user?.id)
                        );

                        if (activeDebts.length > 0) {
                          return activeDebts.map((debt, idx) => {
                            const isMePayer = debt.from === user?.id;
                            const symbol = debt.currency === 'USD' ? '$' : '₹';
                            const amountText = `${symbol}${debt.amount.toFixed(2)}`;

                            return (
                              <div key={`${m.id}-${debt.currency}-${idx}`} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0 pb-3 last:pb-0 gap-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-white select-none uppercase"
                                       style={{ backgroundColor: ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c'][m.name.charCodeAt(0) % 6] }}>
                                    {m.name[0]}
                                  </div>
                                  <div className="text-left leading-tight">
                                    <h4 className="text-xs font-extrabold text-gray-900">{m.name}</h4>
                                    <p className="text-[10px] text-text-muted mt-0.5 font-semibold">
                                      {isMePayer ? `You owe ${amountText}` : `${m.name.split(' ')[0]} owes you ${amountText}`}
                                    </p>
                                  </div>
                                </div>

                                <div>
                                  {isMePayer ? (
                                    <button
                                      onClick={() => {
                                        setPayNowTarget({ member: m, debtAmount: debt.amount, currency: debt.currency, isMePayer: true });
                                        setPayAmount(debt.amount.toString());
                                        setPayMethod('cash');
                                        setPayNotes('');
                                        setToast(null);
                                      }}
                                      className="px-3 py-1.5 bg-[#0e5c3e] hover:bg-[#0b4a32] text-white text-[10px] font-extrabold rounded-lg transition-all cursor-pointer border-none shadow-xs"
                                    >
                                      Pay Now
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleOpenReminder(m, debt.amount, debt.currency)}
                                      className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-gray-300 text-gray-750 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer shadow-xs"
                                    >
                                      Send Reminder
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          });
                        }

                        // Render settled state row
                        return (
                          <div key={m.id} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0 pb-3 last:pb-0 gap-3">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-white select-none uppercase"
                                   style={{ backgroundColor: ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c'][m.name.charCodeAt(0) % 6] }}>
                                {m.name[0]}
                              </div>
                              <div className="text-left leading-tight">
                                <h4 className="text-xs font-extrabold text-gray-900">{m.name}</h4>
                                <p className="text-[10px] text-text-muted mt-0.5 font-semibold">Flatmate is settled</p>
                              </div>
                            </div>

                            <div>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-green-50 text-[#2e7d32] border border-[#c8e6c9]/40">
                                Settled
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}

            {/* 2. Group Members card */}
            {activeView === 'members' && (
              <div className="bg-white border border-border-custom rounded-3xl p-6 shadow-sm text-left">
                <div className="flex justify-between items-center pb-3 border-b border-border-custom">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">Group Members</h3>
                  <span className="text-[10px] bg-grey-bg text-text-muted border border-border-custom px-2 py-0.5 rounded-full font-bold">
                    {members.length}
                  </span>
                </div>

                <div className="space-y-3.5 mt-4">
                  {members.map(m => {
                    const isCurrentUser = m.id === user.id;

                    return (
                      <div key={m.id} className="flex justify-between items-center py-0.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-grey-bg border border-border-custom flex items-center justify-center text-text-primary text-xs font-bold font-sans">
                            {m.name[0].toUpperCase()}
                          </div>
                          <div className="text-left">
                            <h4 className="text-base font-bold text-text-primary leading-tight">
                              {m.name} {isCurrentUser && <span className="text-[9px] text-text-muted font-normal">(you)</span>}
                            </h4>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Simplified Debts card */}
            {activeView === 'settlements' && (
              <div className="bg-white border border-border-custom rounded-3xl p-6 shadow-sm text-left">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted pb-3 border-b border-border-custom">Simplified Debts</h3>
                
                <div className="space-y-4 mt-4">
                  {/* INR Debts */}
                  {balances.simplifiedDebtsByCurrency?.INR?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">INR Debts</p>
                      <div className="space-y-2">
                        {balances.simplifiedDebtsByCurrency.INR.map((debt, idx) => (
                          <div key={idx} className="bg-grey-bg/50 border border-border-custom p-3 rounded-xl flex items-center justify-between text-sm">
                            <div className="text-left pr-2 leading-tight">
                              <span className="font-bold text-text-primary">{debt.fromUser?.name}</span>
                              <span className="text-text-muted"> owes </span>
                              <span className="font-bold text-text-primary">{debt.toUser?.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-text-primary text-sm">₹{debt.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                              <button
                                onClick={() => handleQuickSettlement(debt.from, debt.to, debt.amount, 'INR')}
                                className="text-xs bg-green-pri hover:bg-green-light text-white px-2.5 py-1 rounded font-bold cursor-pointer border-none"
                              >
                                Settle
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* USD Debts */}
                  {balances.simplifiedDebtsByCurrency?.USD?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">USD Debts</p>
                      <div className="space-y-2">
                        {balances.simplifiedDebtsByCurrency.USD.map((debt, idx) => (
                          <div key={idx} className="bg-grey-bg/50 border border-border-custom p-3 rounded-xl flex items-center justify-between text-sm">
                            <div className="text-left pr-2 leading-tight">
                              <span className="font-bold text-text-primary">{debt.fromUser?.name}</span>
                              <span className="text-text-muted"> owes </span>
                              <span className="font-bold text-text-primary">{debt.toUser?.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-text-primary text-sm">${debt.amount.toFixed(2)}</span>
                              <button
                                onClick={() => handleQuickSettlement(debt.from, debt.to, debt.amount, 'USD')}
                                className="text-xs bg-green-pri hover:bg-green-light text-white px-2.5 py-1 rounded font-bold cursor-pointer border-none"
                              >
                                Settle
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(!balances.simplifiedDebtsByCurrency?.INR?.length && !balances.simplifiedDebtsByCurrency?.USD?.length) && (
                    <p className="text-sm text-text-muted text-left">No outstanding debts in this group! 🥳</p>
                  )}
                </div>
              </div>
            )}

          </aside>

          {/* Right Column (Timeline & Expense Details) */}
          {activeView !== 'members' && (
            <section className="flex-1 flex flex-col gap-6">
              
              {/* Action Header block */}
              {activeView === 'expenses' ? (
                <div className="flex items-center justify-between pb-3 border-b border-border-custom text-left">
                  <h2 className="text-xl font-bold text-text-primary">
                    Expense History
                  </h2>
                  <button
                    onClick={openGenericExpenseModal}
                    className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#0e5c3e] hover:bg-[#0b4a32] text-white shadow-xs font-bold text-sm transition-all cursor-pointer border-none"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Expense</span>
                  </button>
                </div>
              ) : activeView === 'settlements' ? (
                <div className="flex items-center justify-between pb-3 border-b border-border-custom text-left">
                  <h2 className="text-xl font-bold text-text-primary">
                    Settlements History
                  </h2>
                  <button
                    onClick={openGenericSettlementModal}
                    className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#0e5c3e] hover:bg-[#0b4a32] text-white shadow-xs font-bold text-sm transition-all cursor-pointer border-none"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Settle Up</span>
                  </button>
                </div>
              ) : null}

              {/* Expandable row details card inside drawer overlay */}
              {selectedExpense && (
                <ExpenseDetail
                  expense={selectedExpense}
                  splits={selectedExpense.splits || []}
                  group={group}
                  currentUser={user}
                  onClose={() => setSelectedExpense(null)}
                  onDelete={() => handleDeleteExpense(selectedExpense.id)}
                  chatMessages={chatMessages}
                  newMessage={newMessage}
                  setNewMessage={setNewMessage}
                  onSendMessage={handleSendChatMessage}
                  chatLoading={chatLoading}
                  chatBottomRef={chatBottomRef}
                />
              )}

              {/* Month Timeline / Settlements List */}
              {activeView === 'expenses' ? (
                expenses.length === 0 ? (
                  <div className="flex flex-col">
                    <div className="bg-white border border-border-custom rounded-3xl p-16 text-center shadow-sm relative overflow-hidden flex flex-col items-center justify-center">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(14,92,62,0.04)_0%,transparent_70%)] pointer-events-none"></div>
                      
                      {/* Floating notes and coins graphic */}
                      <div className="relative w-28 h-28 mb-6 bg-gradient-to-b from-green-50/50 to-green-100/30 rounded-full border border-green-150/40 flex items-center justify-center shadow-inner">
                        <div className="absolute animate-bounce" style={{ animationDuration: '3.5s' }}>
                          <svg className="w-14 h-14 text-green-700" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="14" y="24" width="30" height="18" rx="2" transform="rotate(-15 14 24)" fill="#22c55e" stroke="#15803d" strokeWidth="1.5" />
                            <circle cx="26" cy="30" r="3.5" transform="rotate(-15 26 30)" fill="#86efac" />
                            <rect x="22" y="18" width="30" height="18" rx="2" transform="rotate(10 22 18)" fill="#15803d" stroke="#14532d" strokeWidth="1.5" />
                            <circle cx="36" cy="27" r="3.5" transform="rotate(10 36 27)" fill="#4ade80" />
                            <circle cx="10" cy="16" r="3.5" fill="#fbbf24" stroke="#d97706" strokeWidth="1.2" />
                            <circle cx="48" cy="42" r="4.5" fill="#fbbf24" stroke="#d97706" strokeWidth="1.2" />
                            <circle cx="54" cy="20" r="3" fill="#fbbf24" stroke="#d97706" strokeWidth="1.2" />
                          </svg>
                        </div>
                      </div>

                      <h3 className="text-lg font-extrabold text-gray-900 mb-2 leading-tight">This group has no expenses yet</h3>
                      <p className="text-xs text-gray-500 max-w-sm mx-auto mb-8 leading-relaxed">
                        Start tracking shared expenses with your flatmates by adding an expense manually or importing a statement.
                      </p>

                      <button
                        onClick={openGenericExpenseModal}
                        className="px-5 py-2.5 bg-[#0e5c3e] hover:bg-[#0b4a32] text-white rounded-full font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm hover:shadow cursor-pointer border-none"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add Expense</span>
                      </button>
                    </div>
                  </div>
                ) : filteredExpenses.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-border-custom p-12 text-center shadow-sm max-w-xl mx-auto my-12 text-left flex flex-col items-center justify-center">
                    <span className="text-4xl block mb-4 select-none">🔍</span>
                    <h3 className="text-base font-extrabold text-text-primary mb-2">No matching expenses found</h3>
                    <p className="text-xs text-text-muted max-w-sm mx-auto mb-5">
                      Try adjusting your keywords or clearing the search query to view all expenses.
                    </p>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="px-4 py-2 bg-green-pri hover:bg-green-light text-white rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer border-none"
                    >
                      Clear Search
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.keys(groupedExpenses).map((monthLabel) => (
                      <div key={monthLabel} className="month-group">
                        <h4 className="month-label uppercase font-bold tracking-wider text-text-muted text-sm pb-2 border-b border-border-custom mb-3 text-left">
                          {monthLabel}
                        </h4>
                        <div className="space-y-3">
                          {groupedExpenses[monthLabel].map((exp) => {
                            const amount = parseFloat(exp.amount || 0);
                            const currencySym = exp.currency === 'USD' ? '$' : '₹';
                            const payerId = exp.paid_by?.id || exp.paid_by;
                            const isMePayer = String(payerId) === String(user.id);
                            const payerName = isMePayer ? 'You' : exp.payer?.name || 'Someone';
                            const parts = exp.description.split(':');
                            const category = parts.length > 1 ? parts[0] : 'Other';
                            const displayDescription = parts.length > 1 ? parts.slice(1).join(':') : exp.description;

                            let categoryIcon = <Info className="h-5 w-5" />;
                            if (category === 'Food') categoryIcon = <Utensils className="h-5 w-5" />;
                            else if (category === 'Rent') categoryIcon = <Home className="h-5 w-5" />;
                            else if (category === 'Travel') categoryIcon = <Plane className="h-5 w-5" />;
                            else if (category === 'Fun') categoryIcon = <Clapperboard className="h-5 w-5" />;
                            else if (category === 'Other') categoryIcon = <MoreHorizontal className="h-5 w-5" />;

                            return (
                              <div
                                key={exp.id}
                                onClick={() => handleOpenExpenseDetails(exp)}
                                className="group flex items-center justify-between p-5 bg-white hover:bg-grey-light/50 border border-border-custom hover:border-green-pri/30 rounded-2xl transition-all cursor-pointer shadow-sm"
                              >
                                <div className="flex items-center gap-3.5">
                                  <div className="h-10 w-10 rounded-full bg-grey-bg border border-border-custom flex items-center justify-center text-text-muted">
                                    {categoryIcon}
                                  </div>
                                  <div className="text-left">
                                    <h4 className="font-bold text-text-primary text-base group-hover:text-green-pri transition-colors">
                                      {displayDescription}
                                    </h4>
                                    <p className="text-sm text-text-muted mt-0.5">
                                      Paid by {payerName} · {new Date(exp.created_at || exp.date).toLocaleDateString('en-US')}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4">
                                  <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-green-bg text-green-pri border border-green-pri/5">
                                    {exp.currency}
                                  </span>
                                  <div className="text-right">
                                    <p className="text-[10px] uppercase font-semibold text-text-muted tracking-wider">total</p>
                                    <p className="font-extrabold text-text-primary text-base mt-0.5">
                                      {currencySym}{amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                  </div>
                                  <ChevronRight className="h-4 w-4 text-text-muted" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                settlements.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-border-custom p-16 text-center shadow-sm max-w-xl mx-auto my-12 text-left">
                    <span className="text-5xl block mb-4 select-none">🤝</span>
                    <h3 className="text-lg font-extrabold text-text-primary mb-2">This group has no settlements yet</h3>
                    <p className="text-xs text-text-muted max-w-sm mx-auto">
                      Record a settle up transaction between group members to clear off outstanding balances.
                    </p>
                  </div>
                ) : (
                  <div className="bg-white border border-border-custom px-6 py-5 rounded-3xl shadow-sm">
                    <div className="space-y-4">
                      {settlements.map((set) => {
                        const currencySymString = set.currency === 'USD' ? '$' : '₹';
                        const formattedDate = new Date(set.created_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        });
                        
                        const paymentMethodLabel = set.payment_method 
                          ? set.payment_method.toUpperCase().replace('_', ' ')
                          : 'CASH';

                        const statusLabel = set.status || 'completed';
                        const statusColor = statusLabel === 'completed'
                          ? 'bg-green-50 text-[#2e7d32] border-[#c8e6c9]/40'
                          : statusLabel === 'partial'
                          ? 'bg-blue-50 text-blue-600 border-blue-100'
                          : 'bg-red-50 text-red-500 border-red-100';

                        return (
                          <div
                            key={set.id}
                            className="bg-white border border-border-custom px-5 py-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-text-primary text-left shadow-sm hover:bg-grey-light/50 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <span className="text-xl select-none mt-0.5">🤝</span>
                              <div className="leading-tight text-left">
                                <p className="font-bold text-text-primary text-sm">
                                  <strong>{set.payer?.name || 'Someone'}</strong> paid <strong>{set.payee?.name || 'Someone'}</strong>
                                </p>
                                <p className="text-[10px] text-text-muted mt-1.5 font-semibold">
                                  {formattedDate} · <span className="uppercase text-green-pri font-bold">{paymentMethodLabel}</span>
                                </p>
                                {set.notes && (
                                  <p className="text-xs text-text-muted bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 mt-2 italic max-w-sm">
                                    &ldquo;{set.notes}&rdquo;
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3.5 sm:self-center self-end">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${statusColor}`}>
                                {statusLabel}
                              </span>
                              <span className="font-extrabold text-green-owed text-base bg-green-bg border border-green-pri/10 px-3.5 py-1 rounded-xl">
                                {currencySymString}{parseFloat(set.amount).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              )}
            </section>
          )}
        </div>
        </div>

      {/* BALANCE DRILLDOWN MODAL */}
      {drilldownMember && (
        <BalanceDrilldownModal
          member={drilldownMember.member}
          balance={drilldownMember.balance}
          expenses={expenses}
          settlements={settlements}
          members={members}
          onClose={() => setDrilldownMember(null)}
          onSettleUp={(amount) => {
            const payerId = drilldownMember.balance < 0 ? user.id : drilldownMember.member.id;
            const payeeId = drilldownMember.balance < 0 ? drilldownMember.member.id : user.id;
            setSettlePayer(payerId);
            setSettlePayee(payeeId);
            setSettleAmount(Math.abs(amount));
            setSettleCurrency('INR');
            setSettleError('');
            setShowSettlementModal(true);
          }}
        />
      )}

      {/* RECORD SETTLEMENT MODAL */}
      {showSettlementModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-border-custom p-6 rounded-2xl w-full max-w-md shadow-2xl relative text-left">
            <button
              onClick={() => setShowSettlementModal(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary font-bold text-sm cursor-pointer"
            >
              ✕
            </button>

            <h3 className="text-lg font-extrabold text-text-primary mb-1">Record Settle Up</h3>
            <p className="text-xs text-text-muted mb-4">Record a direct cash/UPI payment made between friends.</p>

            {settleError && (
              <div className="mb-4 bg-red-50 text-red-owe p-3 rounded-lg border border-red-200 text-xs font-semibold">
                {settleError}
              </div>
            )}

            <form onSubmit={handleRecordSettlement} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-text-muted mb-1">Sender (Paid By)</label>
                <select
                  value={settlePayer}
                  onChange={(e) => setSettlePayer(e.target.value)}
                  className="w-full bg-grey-bg border border-border-custom rounded-xl px-3 py-2.5 text-text-primary focus:outline-none text-xs"
                >
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-text-muted mb-1">Recipient (Paid To)</label>
                <select
                  value={settlePayee}
                  onChange={(e) => setSettlePayee(e.target.value)}
                  className="w-full bg-grey-bg border border-border-custom rounded-xl px-3 py-2.5 text-text-primary focus:outline-none text-xs"
                >
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold uppercase text-text-muted mb-1">Amount</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-grey-bg border border-border-custom rounded-xl px-3 py-2.5 text-text-primary focus:outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-text-muted mb-1">Currency</label>
                  <select
                    value={settleCurrency}
                    onChange={(e) => setSettleCurrency(e.target.value)}
                    className="w-full bg-grey-bg border border-border-custom rounded-xl px-3 py-2.5 text-text-primary focus:outline-none text-xs"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-text-muted mb-1">
                  Payment Method
                </label>
                <select
                  value={settlePaymentMethod}
                  onChange={(e) => setSettlePaymentMethod(e.target.value)}
                  className="w-full bg-grey-bg border border-border-custom rounded-xl px-3 py-2.5 text-text-primary focus:outline-none text-xs"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-text-muted mb-1">
                  Optional Notes
                </label>
                <textarea
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  placeholder="Add payment context (e.g. sent via GPay)"
                  rows={2}
                  className="w-full bg-grey-bg border border-border-custom rounded-xl px-3 py-2.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-green-pri"
                />
              </div>

              <button
                type="submit"
                disabled={settleLoading}
                className="w-full mt-4 py-3 bg-green-pri hover:bg-green-light text-white font-bold rounded-xl shadow-md transition-all cursor-pointer text-xs disabled:opacity-50 border-none"
              >
                {settleLoading ? 'Recording...' : 'Save Settlement'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ADD EXPENSE MODAL */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-border-custom p-6 rounded-2xl w-full max-w-lg shadow-2xl relative text-left max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowExpenseModal(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary font-bold text-sm cursor-pointer"
            >
              ✕
            </button>

            <h3 className="text-lg font-extrabold text-text-primary mb-1">Add Shared Expense</h3>
            <p className="text-xs text-text-muted mb-4">Enter a bill or shared transaction to split among flatmates.</p>

            {expenseError && (
              <div className="mb-4 bg-red-50 text-red-owe p-3 rounded-lg border border-red-200 text-xs font-semibold">
                {expenseError}
              </div>
            )}

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold uppercase text-text-muted mb-1">Description</label>
                  <input
                    type="text"
                    required
                    value={expDescription}
                    onChange={(e) => setExpDescription(e.target.value)}
                    placeholder="e.g. Groceries BigBasket"
                    className="w-full bg-grey-bg border border-border-custom rounded-xl px-3 py-2 text-text-primary focus:outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-text-muted mb-1">Currency</label>
                  <select
                    value={expCurrency}
                    onChange={(e) => setExpCurrency(e.target.value)}
                    className="w-full bg-grey-bg border border-border-custom rounded-xl px-3 py-2 text-text-primary focus:outline-none text-xs"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-text-muted mb-1">Total Cost ({currencySymbol})</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-grey-bg border border-border-custom rounded-xl px-3 py-2 text-text-primary focus:outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-text-muted mb-1">Paid By</label>
                  <select
                    value={expPayer}
                    onChange={(e) => setExpPayer(e.target.value)}
                    className="w-full bg-grey-bg border border-border-custom rounded-xl px-3 py-2 text-text-primary focus:outline-none text-xs"
                  >
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-text-muted mb-1">Split Method</label>
                <select
                  value={expSplitType}
                  onChange={(e) => setExpSplitType(e.target.value)}
                  className="w-full bg-grey-bg border border-border-custom rounded-xl px-3 py-2 text-text-primary focus:outline-none text-xs"
                >
                  <option value="equal">Split Equally</option>
                  <option value="unequal">Unequally (exact values)</option>
                  <option value="percentage">By Percentages (%)</option>
                  <option value="share">By Shares (ratios)</option>
                </select>
              </div>

              {/* Dynamic split input tables depending on split type */}
              <div className="border-t border-slate-100 pt-3">
                <p className="text-[10px] font-bold uppercase text-text-muted mb-2">Split Participants Details</p>
                <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  {members.map(m => {
                    if (expSplitType === 'equal') {
                      return (
                        <div key={m.id} className="flex items-center gap-3 text-xs">
                          <input
                            type="checkbox"
                            checked={!!splitCheckboxes[m.id]}
                            onChange={() => handleCheckboxChange(m.id)}
                            className="rounded text-green-pri focus:ring-green-pri"
                          />
                          <span className="font-semibold text-text-primary">{m.name}</span>
                        </div>
                      );
                    }
                    
                    let suffix = '';
                    let placeholder = '';
                    if (expSplitType === 'unequal') { suffix = currencySymbol; placeholder = '0.00'; }
                    else if (expSplitType === 'percentage') { suffix = '%'; placeholder = '0'; }
                    else if (expSplitType === 'share') { suffix = 'shares'; placeholder = '1'; }

                    return (
                      <div key={m.id} className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-text-primary">{m.name}</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="1"
                            min="0"
                            placeholder="0"
                            value={splitInputs[m.id] || ''}
                            onChange={(e) => handleSplitInputsChange(m.id, e.target.value)}
                            className="bg-white border border-border-custom rounded px-2.5 py-1 text-xs text-right w-24 text-text-primary focus:outline-none"
                          />
                          <span className="text-[10px] font-bold text-text-muted">{suffix}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={expenseLoading}
                className="w-full mt-4 py-3 bg-green-pri hover:bg-green-light text-white font-bold rounded-xl shadow-md transition-all cursor-pointer text-xs disabled:opacity-50 border-none"
              >
                {expenseLoading ? 'Adding...' : 'Save Expense'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Invite Member modal block */}
      {showMemberForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-border-custom rounded-3xl p-6 max-w-md w-full shadow-xl text-left relative">
            <h3 className="text-base font-extrabold text-gray-900 border-b border-border-custom pb-3 mb-4">
              Invite New Flatmate
            </h3>
            <p className="text-xs text-text-muted mb-4">Send an invitation to join this shared ledger.</p>
            {memberError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-owe p-3 rounded-lg text-xs font-semibold">
                {memberError}
              </div>
            )}
            <form onSubmit={handleInviteMember} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-text-muted mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="e.g. flatmate@example.com"
                  className="w-full bg-grey-bg border border-border-custom rounded-xl px-3.5 py-2.5 text-text-primary placeholder-text-muted focus:outline-none focus:border-green-pri text-xs"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2 border-t border-border-custom mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowMemberForm(false);
                    setNewMemberEmail('');
                    setMemberError('');
                  }}
                  className="px-4 py-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-grey-bg text-xs font-semibold transition-all cursor-pointer bg-transparent border-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={memberLoading}
                  className="px-4 py-2 bg-green-pri hover:bg-green-light text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer disabled:opacity-50 border-none"
                >
                  {memberLoading ? 'Sending...' : 'Invite Flatmate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </Layout>
  );
}
