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
  deleteGroup,
  updateGroupName
} from '@/lib/api';

import Avatar from '@/components/ui/Avatar';
import PersonBalanceRow from '@/components/PersonBalanceRow';
import ExpenseRow from '@/components/ExpenseRow';
import ExpenseDetail from '@/components/ExpenseDetail';
import BalanceDrilldownModal from '@/components/BalanceDrilldownModal';
import { 
  ArrowLeft, 
  RefreshCw, 
  Trash2, 
  Pencil,
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
  Wallet,
  Landmark,
  UserX,
  X
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

  // Group name edit state
  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [editedGroupName, setEditedGroupName] = useState('');
  const [groupNameLoading, setGroupNameLoading] = useState(false);

  const handleUpdateGroupName = async (e) => {
    e?.preventDefault();
    if (!editedGroupName.trim() || editedGroupName.trim() === group.name) {
      setIsEditingGroupName(false);
      return;
    }
    setGroupNameLoading(true);
    try {
      await updateGroupName(group.id, editedGroupName.trim());
      setGroup((prev) => ({ ...prev, name: editedGroupName.trim() }));
      setIsEditingGroupName(false);
      setToast({ message: 'Group name updated successfully!', type: 'success' });
    } catch (err) {
      console.error('Error updating group name:', err);
      setToast({ message: err.message || 'Failed to update group name', type: 'error' });
    } finally {
      setGroupNameLoading(false);
    }
  };

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

  // Automatically update expense date to today's current date when form is opened
  useEffect(() => {
    if (isAddingExpense || showExpenseModal) {
      const today = new Date().toISOString().split('T')[0];
      setExpDate(today);
    }
  }, [isAddingExpense, showExpenseModal]);

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
      const [g, m, expList, setList, balData] = await Promise.all([
        fetchGroupDetails(groupId),
        fetchGroupMembers(groupId),
        fetchGroupExpenses(groupId),
        fetchGroupSettlements(groupId),
        calculateBalancesAndDebts(groupId)
      ]);

      setGroup(g);
      setMembers(m);
      if (m && m.length > 0) {
        setExpPayer((prev) => prev || user?.id || m[0].id);
        setSettlePayer((prev) => prev || user?.id || m[0].id);
        setSettlePayee((prev) => prev || m.find((mem) => mem.id !== (user?.id || m[0].id))?.id || m[0].id);
        setSplitCheckboxes((prev) => {
          if (Object.keys(prev).length === 0) {
            const initial = {};
            m.forEach((mem) => { initial[mem.id] = true; });
            return initial;
          }
          return prev;
        });
      }
      setExpenses(expList);
      setSettlements(setList);
      setBalances(balData);

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
      const actualPayer = expPayer || user?.id || (members[0]?.id || null);
      if (!actualPayer) {
        setExpenseError('Please select a valid payer.');
        setExpenseLoading(false);
        return;
      }
      await addExpense(groupId, actualPayer, finalDescription, totalAmt, expSplitType, splits, expCurrency, expDate);
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
      {drilldownMember && (
        <BalanceDrilldownModal
          member={drilldownMember.member}
          balance={drilldownMember.balance}
          expenses={expenses}
          settlements={settlements}
          members={members}
          currentUserId={user.id}
          onClose={() => setDrilldownMember(null)}
        />
      )}
      {payNowTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 select-none">
          <div className="stitch-glass-card border border-emerald-900/60 bg-[#0b1610]/95 p-8 rounded-3xl w-full max-w-md shadow-2xl relative text-left space-y-5">
            <button
              onClick={() => setPayNowTarget(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-900 transition-colors bg-transparent border-none cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="pb-3 border-b border-slate-800">
              <h3 className="text-xl font-extrabold text-white tracking-tight mb-1">
                Record Payment to {payNowTarget.member.name}
              </h3>
              <p className="text-xs text-slate-400 font-medium">Record a partial or full payment made to clear debt.</p>
            </div>
            
            <form onSubmit={handlePayNowConfirm} className="space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-400 mb-1 tracking-wider">
                  Outstanding Debt
                </label>
                <p className="text-2xl font-black text-emerald-400 tracking-tight">
                  {payNowTarget.currency === 'USD' ? '$' : '₹'}{payNowTarget.debtAmount.toFixed(2)}
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-300 mb-1.5 tracking-wider">
                  Payment Amount (Partial or Full)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-extrabold text-xs">
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
                    className="w-full bg-[#0f172a] border border-slate-800 rounded-xl pl-9 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-extrabold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-300 mb-1.5 tracking-wider">
                  Payment Method
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-300 mb-1.5 tracking-wider">
                  Optional Notes
                </label>
                <textarea
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Add payment context (e.g. sent via GPay)"
                  rows={2}
                  className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="flex justify-end items-center gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPayNowTarget(null)}
                  className="px-5 py-2.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-900 text-xs font-bold transition-all cursor-pointer bg-transparent border-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settlementLoading}
                  className="px-6 py-2.5 bg-[#10b981] hover:bg-emerald-400 text-slate-950 text-xs font-extrabold rounded-full shadow-lg shadow-emerald-500/20 cursor-pointer border-none disabled:opacity-50 flex items-center gap-1.5 transition-all"
                >
                  {settlementLoading ? 'Saving...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {reminderTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 select-none">
          <div className="stitch-glass-card border border-emerald-900/60 bg-[#0b1610]/95 p-8 rounded-3xl w-full max-w-md shadow-2xl relative text-left space-y-5">
            <button
              onClick={() => setReminderTarget(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-900 transition-colors bg-transparent border-none cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="pb-3 border-b border-slate-800">
              <h3 className="text-xl font-extrabold text-white tracking-tight mb-1">
                Send Reminder to {reminderTarget.member.name}
              </h3>
              <p className="text-xs text-slate-400 font-medium">Send a friendly payment reminder via WhatsApp or Email.</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-300 mb-1.5 tracking-wider">
                  Polite Message
                </label>
                <textarea
                  readOnly
                  value={reminderTarget.message}
                  rows={3}
                  className="w-full bg-[#0f172a] border border-slate-800 rounded-xl p-4 text-xs text-slate-200 focus:outline-none resize-none font-medium leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCopyReminder}
                  className="py-3 bg-emerald-950 text-emerald-400 border border-emerald-800/60 hover:bg-emerald-900/80 font-extrabold rounded-2xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>📋</span>
                  <span>{copiedText ? 'Copied!' : 'Copy Text'}</span>
                </button>
                
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(reminderTarget.message)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 bg-[#25d366] hover:bg-[#20ba5a] text-slate-950 font-extrabold rounded-2xl text-xs transition-all cursor-pointer border-none flex items-center justify-center gap-2 text-center no-underline"
                >
                  <span>💬</span>
                  <span>WhatsApp</span>
                </a>
              </div>

              <div className="pt-1">
                <a
                  href={`mailto:?subject=${encodeURIComponent('Payment Reminder: ' + group.name)}&body=${encodeURIComponent(reminderTarget.message)}`}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-2xl text-xs transition-all border border-slate-700 cursor-pointer flex items-center justify-center gap-2 text-center no-underline"
                >
                  <span>✉️</span>
                  <span>Share via Email</span>
                </a>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-800">
                <button
                  onClick={() => setReminderTarget(null)}
                  className="px-5 py-2.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-900 text-xs font-bold transition-all cursor-pointer bg-transparent border-none"
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
        <div className="stitch-dashboard-dark w-full flex-1 flex flex-col min-h-screen overflow-x-hidden text-left select-none bg-[#07100b] text-white font-sans">
          {/* Top Header Bar */}
          <Header
            isDark={true}
            leftSection={
              <div className="flex items-center gap-3 text-left">
                <button
                  onClick={() => {
                    setIsAddingExpense(false);
                    if (searchParams.get('action') === 'add-expense') {
                      router.push(`/groups/${groupId}?tab=expenses`);
                    }
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer border-none bg-transparent"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="text-lg font-extrabold text-white tracking-tight">Add New Expense</h1>
              </div>
            }
          >
            <button
              onClick={loadData}
              disabled={pageLoading}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-900 transition-all cursor-pointer border-none bg-transparent"
              title="Refresh balances"
            >
              <RefreshCw className={`h-4.5 w-4.5 ${pageLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowMemberForm(true)}
              className="px-5 py-2 bg-[#10b981] hover:bg-emerald-400 text-slate-950 text-xs font-extrabold rounded-full transition-all cursor-pointer border-none shadow-md"
            >
              Invite Member
            </button>
          </Header>

          {/* Form Content body container */}
          <div className="page-body flex-1 overflow-y-auto px-8 py-8">
            {expenseError && (
              <div className="mb-4 bg-red-950/80 border border-red-900 text-red-300 p-3.5 rounded-2xl text-xs font-semibold text-left max-w-5xl mx-auto">
                {expenseError}
              </div>
            )}
            
            <form onSubmit={handleAddExpense} className="max-w-5xl mx-auto flex flex-col md:flex-row gap-6">
              
              {/* Left Form Box (Expense Info and Who Paid) */}
              <div className="flex-grow flex flex-col gap-6">
                
                {/* Expense Information Box */}
                <div className="stitch-glass-card rounded-3xl p-6 border border-emerald-900/60 bg-[#0b1610]/95 shadow-xl text-left space-y-4">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Info className="h-4.5 w-4.5 text-emerald-400" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300">Expense Information</span>
                  </div>
                  
                  {/* Description input */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Description</label>
                    <input
                      type="text"
                      required
                      value={expDescription}
                      onChange={(e) => setExpDescription(e.target.value)}
                      placeholder="What was this for? (e.g. Weekly Groceries)"
                      className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all text-left font-medium"
                    />
                  </div>

                  {/* Amount and Date Input */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Amount</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                          ₹
                        </span>
                        <input
                          type="number"
                          step="1"
                          min="1"
                          required
                          value={expAmount}
                          onChange={(e) => setExpAmount(e.target.value)}
                          placeholder="0"
                          className="w-full pl-9 pr-4 py-3 bg-[#0f172a] border border-slate-800 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500 transition-all text-left"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Date</label>
                        {expDate && !isNaN(new Date(expDate + 'T00:00:00').getTime()) && (
                          <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800/40">
                            {new Date(expDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                      <input
                        type="date"
                        required
                        value={expDate}
                        onChange={(e) => setExpDate(e.target.value)}
                        className="w-full px-4 py-3 bg-[#0f172a] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 transition-all text-left font-medium [color-scheme:dark]"
                      />
                    </div>
                  </div>

                </div>

                {/* Who Paid Section */}
                <div className="stitch-glass-card rounded-3xl p-6 border border-emerald-900/60 bg-[#0b1610]/95 shadow-xl text-left space-y-4">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Users className="h-4.5 w-4.5 text-emerald-400" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300">Who paid?</span>
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
                              ? 'ring-2 ring-emerald-400 opacity-100 scale-105 shadow-md shadow-emerald-500/20' 
                              : 'opacity-50 hover:opacity-80'
                          }`}
                          style={{
                            backgroundColor: ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c'][m.name.charCodeAt(0) % 6]
                          }}>
                            {m.name[0].toUpperCase()}
                          </div>
                          <span className={`text-[10px] font-extrabold ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {m.id === user.id ? 'You' : m.name.split(' ')[0]}
                          </span>
                        </button>
                      );
                    })}
                    
                    <button
                      type="button"
                      onClick={() => setShowMemberForm(true)}
                      className="h-11 w-11 rounded-full border border-dashed border-slate-700 flex items-center justify-center text-slate-400 hover:border-emerald-500 hover:text-emerald-400 transition-colors cursor-pointer bg-slate-900/60"
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
                <div className="stitch-glass-card rounded-3xl p-6 border border-emerald-900/60 bg-[#0b1610]/95 shadow-xl text-left space-y-4">
                  <div className="flex items-center gap-2 text-slate-300">
                    <svg className="h-4.5 w-4.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300">Split Configuration</span>
                  </div>

                  {/* Split Method Selector Tabs */}
                  <div className="flex bg-slate-900/90 p-1 rounded-full border border-slate-800">
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
                          className={`flex-1 py-1.5 text-xs font-extrabold rounded-full transition-all cursor-pointer border-none ${
                            isActive
                              ? 'bg-[#10b981] text-slate-950 shadow-sm'
                              : 'text-slate-400 hover:text-white bg-transparent'
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Split members checklist */}
                  <div className="space-y-3 pt-2">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Select members to split with:</p>
                    
                    {/* Master Checkbox */}
                    {expSplitType === 'equal' && (
                      <div className="flex items-center justify-between bg-emerald-950/40 border border-emerald-800/50 p-3 rounded-2xl">
                        <label className="flex items-center gap-2.5 text-xs font-extrabold text-white cursor-pointer">
                          <input
                            type="checkbox"
                            checked={members.every(m => splitCheckboxes[m.id])}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const updated = {};
                              members.forEach(m => { updated[m.id] = checked; });
                              setSplitCheckboxes(updated);
                            }}
                            className="rounded accent-emerald-500 h-4 w-4"
                          />
                          <span className="text-xs font-extrabold text-emerald-400">Everyone (All {members.length})</span>
                        </label>
                        
                        {/* Calculate equal split amount */}
                        {parseFloat(expAmount) > 0 && (() => {
                          const activeCount = Object.values(splitCheckboxes).filter(Boolean).length;
                          const amt = activeCount > 0 ? (parseFloat(expAmount) / activeCount) : 0;
                          return (
                            <span className="text-xs font-extrabold text-emerald-400">
                              ₹{amt.toFixed(2)} ea
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
                            valText = `₹${(parseFloat(expAmount) / activeCount).toFixed(2)}`;
                          }
                          return (
                            <div key={m.id} className="flex items-center justify-between text-xs py-1">
                              <label className="flex items-center gap-2.5 text-white cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleCheckboxChange(m.id)}
                                  className="rounded accent-emerald-500 h-4 w-4"
                                />
                                <span className="font-extrabold">{m.name} {m.id === user.id && '(Primary)'}</span>
                              </label>
                              <span className="text-emerald-400 font-extrabold">{valText}</span>
                            </div>
                          );
                        }

                        // For exact and percentages, show input fields
                        let prefixSuffix = expSplitType === 'percentage' ? '%' : '₹';
                        return (
                          <div key={m.id} className="flex items-center justify-between text-xs py-0.5">
                            <span className="font-extrabold text-white">{m.name} {m.id === user.id && '(Primary)'}</span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                step="1"
                                min="0"
                                value={splitInputs[m.id] || ''}
                                onChange={(e) => handleSplitInputsChange(m.id, e.target.value)}
                                placeholder="0"
                                className="bg-[#0f172a] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-right w-20 text-white focus:outline-none focus:border-emerald-500 font-medium"
                              />
                              <span className="text-[10px] font-extrabold text-slate-400">{prefixSuffix}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Total to Split box */}
                <div className="bg-emerald-950/50 border border-emerald-800/60 rounded-2xl p-4 flex justify-between items-center text-xs">
                  <span className="font-extrabold text-slate-300">Total to Split</span>
                  <span className="text-lg font-black text-emerald-400">
                    ₹{parseFloat(expAmount || 0).toFixed(2)}
                  </span>
                </div>

                {/* Submit and Cancel Buttons */}
                <div className="flex flex-col gap-3">
                  <button
                    type="submit"
                    disabled={expenseLoading}
                    className="w-full py-3.5 bg-[#10b981] hover:bg-emerald-400 text-slate-950 font-extrabold rounded-full shadow-lg shadow-emerald-500/20 transition-all cursor-pointer text-xs flex items-center justify-center gap-2 border-none disabled:opacity-50"
                  >
                    {expenseLoading ? (
                      <span>Saving...</span>
                    ) : (
                      <>
                        <Check className="h-4.5 w-4.5 text-slate-950" />
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
                    className="text-slate-400 hover:text-white text-xs font-semibold py-1 bg-transparent border-none cursor-pointer transition-colors"
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
        <div className="stitch-dashboard-dark w-full flex-1 flex flex-col min-h-screen overflow-x-hidden text-left select-none bg-[#07100b] text-white font-sans">
          {/* Top Header Bar */}
          <Header
            isDark={true}
            placeholder="Search members or activity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          >
            <button
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-900 transition-all cursor-pointer border-none bg-transparent"
              title="Help"
            >
              <HelpCircle className="h-4.5 w-4.5" />
            </button>

            <button
              onClick={() => setIsAddingExpense(true)}
              className="px-5 py-2 bg-[#10b981] hover:bg-emerald-400 text-slate-950 text-xs font-extrabold rounded-full transition-all cursor-pointer border-none shadow-md"
            >
              Back to Overview
            </button>
          </Header>

          {/* Members Content container */}
          <div className="page-body flex-1 overflow-y-auto px-8 py-8 space-y-6 text-left">
            
            {/* Breadcrumbs and Title row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2 mt-1">
                  Groups &gt; <span className="font-extrabold text-emerald-400 cursor-pointer hover:underline" onClick={() => router.push(`/groups/${groupId}?tab=expenses`)}>{group.name}</span>
                </h1>
                <p className="text-xs text-slate-400 mt-1 font-medium">
                  Organize your roommates and manage contribution permissions.
                </p>
              </div>

              <button
                onClick={() => setShowMemberForm(!showMemberForm)}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#10b981] hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-full transition-all cursor-pointer border-none shadow-lg shadow-emerald-500/20 transform hover:-translate-y-0.5"
              >
                <UserPlus className="h-4 w-4" />
                <span>Invite Member</span>
              </button>
            </div>

            {/* Invite Form (Centered Popup Modal with Blurred Background) */}
            {showMemberForm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none">
                <div className="stitch-glass-card border border-emerald-900/60 bg-[#0b1610]/95 rounded-3xl p-8 shadow-2xl text-left max-w-md w-full relative overflow-hidden space-y-5 border-emerald-500/20">
                  
                  {/* Modal Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
                        <UserPlus className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-lg text-white tracking-tight">Invite New Flatmate</h3>
                        <p className="text-xs text-slate-400 font-medium">Send an invitation to join this shared ledger.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowMemberForm(false);
                        setNewMemberEmail('');
                        setMemberError('');
                      }}
                      className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-900 transition-colors bg-transparent border-none cursor-pointer"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {memberError && (
                    <div className="bg-red-950/80 border border-red-900 text-red-300 p-3.5 rounded-2xl text-xs font-semibold">
                      {memberError}
                    </div>
                  )}

                  <form onSubmit={handleInviteMember} className="space-y-5">
                    <div>
                      <label className="block text-[11px] font-extrabold uppercase text-slate-300 mb-1.5 tracking-wider">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={newMemberEmail}
                        onChange={(e) => setNewMemberEmail(e.target.value)}
                        placeholder="Enter flatmate email address"
                        className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
                      />
                    </div>

                    <div className="flex justify-end items-center gap-3 pt-3 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setShowMemberForm(false);
                          setNewMemberEmail('');
                          setMemberError('');
                        }}
                        className="px-5 py-2.5 text-slate-300 hover:text-white text-xs font-extrabold transition-all cursor-pointer bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-full"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={memberLoading}
                        className="px-6 py-2.5 bg-[#10b981] hover:bg-emerald-400 text-slate-950 text-xs font-extrabold rounded-full transition-all cursor-pointer border-none shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                      >
                        {memberLoading ? 'Sending...' : 'Send Invitation'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Members summary stats grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              
              {/* Total Members Card */}
              <div className="stitch-glass-card rounded-3xl p-6 border border-emerald-900/60 bg-[#0b1610]/95 shadow-xl flex items-center gap-4 text-left max-w-xs">
                <div className="h-12 w-12 rounded-2xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400 flex-shrink-0 shadow-inner">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Members</p>
                  <p className="text-3xl font-black text-white mt-1 tracking-tight">
                    {members.length < 10 ? `0${members.length}` : members.length}
                  </p>
                </div>
              </div>

            </div>

            {/* Filter and Table container */}
            <div className="stitch-glass-card border border-emerald-900/60 bg-[#0b1610]/95 rounded-3xl overflow-hidden shadow-xl">
              
              {/* Table search filter bar */}
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="relative w-80 text-left">
                  <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Filter by name, email, or role..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-900/90 border border-slate-800 rounded-full text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 transition-all text-left font-medium"
                  />
                </div>
              </div>

              {/* Members Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-900/80 border-b border-slate-800 text-left text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                      <th className="px-6 py-4">Member</th>
                      <th className="px-6 py-4">Email Address</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-left text-xs">
                    {members.map((m, index) => {
                      let statusText = "Active";
                      let statusDotColor = "bg-emerald-400 shadow-emerald-500/50 shadow-xs";
                      let statusTextColor = "text-emerald-400";
                      
                      if (index === 2) {
                        statusText = "Offline";
                        statusDotColor = "bg-slate-500";
                        statusTextColor = "text-slate-400";
                      } else if (index === 3) {
                        statusText = "Invited";
                        statusDotColor = "bg-teal-400";
                        statusTextColor = "text-teal-400";
                      }

                      const addedDates = ["12 Jan 2024", "15 Jan 2024", "02 Feb 2024", "Sent 2 hours ago"];
                      const addedDate = addedDates[index % addedDates.length];

                      return (
                        <tr key={m.id} className="hover:bg-slate-900/50 transition-colors">
                          {/* Member column */}
                          <td className="px-6 py-4 flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase select-none shadow-sm"
                            style={{
                              backgroundColor: ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c'][(m.name || 'U').charCodeAt(0) % 6]
                            }}>
                              {(m.name === 'User' && m.id === user?.id ? (profile?.name || user?.user_metadata?.full_name || 'U') : (m.name || 'U'))[0]}
                            </div>
                            <div>
                              <p className="font-extrabold text-white text-sm leading-none">
                                {m.name === 'User' && m.id === user?.id ? (profile?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User') : m.name}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-1 leading-none font-semibold">
                                {statusText === "Invited" ? `Sent ${addedDate}` : `Added ${addedDate}`}
                              </p>
                            </div>
                          </td>

                          {/* Email column */}
                          <td className="px-6 py-4 text-slate-300 font-semibold">
                            {m.email || (m.id === user?.id ? user?.email : null) || 'N/A'}
                          </td>

                          {/* Status column */}
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-2 font-extrabold ${statusTextColor}`}>
                              <span className={`h-2 w-2 rounded-full ${statusDotColor}`}></span>
                              <span>{statusText}</span>
                            </span>
                          </td>

                          {/* Actions column */}
                          <td className="px-6 py-4 text-right">
                            {statusText === "Invited" && (
                              <button className="px-3.5 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/60 text-emerald-400 rounded-full font-extrabold text-[10px] tracking-wide transition-all cursor-pointer">
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
      <div className="stitch-dashboard-dark w-full flex-1 flex flex-col min-h-screen overflow-x-hidden text-left select-none bg-[#07100b] text-white font-sans">
        <Header
          isDark={true}
          leftSection={
            <div className="flex items-center space-x-3 text-left">
              <div className="h-9.5 w-9.5 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
                <Users className="h-5 w-5 text-slate-950" />
              </div>
              <div className="text-left">
                {isEditingGroupName ? (
                  <form onSubmit={handleUpdateGroupName} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editedGroupName}
                      onChange={(e) => setEditedGroupName(e.target.value)}
                      autoFocus
                      placeholder="Group Name"
                      className="bg-[#0f172a] border border-emerald-500 rounded-lg px-2.5 py-1 text-sm text-white font-extrabold focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={groupNameLoading}
                      className="px-3 py-1 bg-[#10b981] hover:bg-emerald-400 text-slate-950 rounded-lg font-extrabold text-xs cursor-pointer border-none shadow-sm"
                    >
                      {groupNameLoading ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingGroupName(false)}
                      className="px-2 py-1 text-slate-400 hover:text-white text-xs font-bold bg-transparent border-none cursor-pointer"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2 group cursor-pointer" onClick={() => { setEditedGroupName(group.name); setIsEditingGroupName(true); }}>
                    <h1 className="text-xl font-extrabold text-white tracking-tight leading-none group-hover:text-emerald-300 transition-colors">{group.name}</h1>
                    <button
                      type="button"
                      title="Click to rename group"
                      className="p-1 text-slate-400 hover:text-emerald-400 rounded-md hover:bg-slate-900 transition-colors border-none bg-transparent cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <p className="text-[10px] text-emerald-400 mt-1 leading-none font-bold">Ledger details and balances</p>
              </div>
            </div>
          }
          centerSection={
            <SearchBar 
              value={searchQuery} 
              onChange={setSearchQuery} 
              placeholder="Search expenses..." 
              className="w-full"
              isDark={true}
            />
          }
        >

          <button
            onClick={handleDeleteGroup}
            className="flex items-center gap-1.5 px-4 py-2 border border-red-900/60 bg-red-950/60 hover:bg-red-900/80 text-red-300 rounded-full text-xs font-bold transition-all cursor-pointer shadow-sm"
            title="Delete this group"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete Group</span>
          </button>
        </Header>

        {/* Main Body Grid */}
        <div className="page-body overflow-y-auto flex-1 px-6 md:px-10 py-8">
        
        {/* Two column layout for expenses, centered layout for settlements */}
        <div className={`w-full ${activeView === 'settlements' ? 'max-w-3xl mx-auto' : 'max-w-7xl mx-auto flex flex-col md:flex-row gap-8'}`}>
          
          {/* Left Column (Only for Expenses View) */}
          {activeView === 'expenses' && (
            <aside className="w-full md:w-80 flex-shrink-0 flex flex-col gap-6">
              
              {/* 1. MY GROUP BALANCE card */}
              <div className="stitch-glass-card rounded-3xl p-6 border border-emerald-900/60 bg-[#0b1610]/95 shadow-xl text-left relative overflow-hidden space-y-4">
                <div className="absolute top-[-25px] right-[-25px] w-24 h-24 rounded-full bg-emerald-500/10 pointer-events-none blur-xl"></div>
                <div className="flex items-center gap-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <Landmark className="h-3.5 w-3.5 text-emerald-400" />
                  <span>My Group Balance</span>
                </div>
                
                <div className="flex flex-col gap-4 mt-2">
                  <div>
                    <div className={`text-3xl font-black tracking-tight ${
                      myNetINR > 0.01 
                        ? 'text-emerald-400' 
                        : myNetINR < -0.01 
                        ? 'text-red-400' 
                        : 'text-white'
                    }`}>
                      {myNetINR > 0.01 ? '+' : ''}
                      ₹{myNetINR.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                      Indian Rupee (INR)
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={openGenericSettlementModal}
                  className="w-full mt-4 py-3 bg-[#10b981] hover:bg-emerald-400 text-slate-950 font-extrabold rounded-full text-xs transition-all shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-2 border-none transform hover:-translate-y-0.5"
                >
                  <Wallet className="h-4 w-4" />
                  <span>Record Settle Up</span>
                </button>
              </div>

              {/* Pending Balances Card */}
              <div className="stitch-glass-card rounded-3xl p-6 border border-emerald-900/60 bg-[#0b1610]/95 shadow-xl text-left space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                  <Users className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">Pending Balances</h3>
                </div>
                <div className="space-y-4">
                  {members.filter(m => m.id !== user?.id).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
                      <div className="h-12 w-12 rounded-full bg-emerald-950/80 border border-emerald-800/50 flex items-center justify-center text-emerald-400 mb-1">
                        <UserX className="h-5 w-5" />
                      </div>
                      <p className="text-xs text-slate-400 font-semibold">No flatmates added yet.</p>
                      <button 
                        onClick={() => setShowMemberForm(true)} 
                        className="text-xs font-extrabold text-emerald-400 hover:text-emerald-300 bg-transparent border-none cursor-pointer hover:underline"
                      >
                        Invite Friends
                      </button>
                    </div>
                  ) : (
                    members.filter(m => m.id !== user?.id).map(m => {
                      const debtsList = balances?.pairwiseDebts || balances?.simplifiedDebts || [];
                      const activeDebts = debtsList.filter(d => 
                        (d.from === user?.id && d.to === m.id) || (d.from === m.id && d.to === user?.id)
                      );

                      if (activeDebts.length > 0) {
                        return activeDebts.map((debt, idx) => {
                          const isMePayer = debt.from === user?.id;
                          const symbol = debt.currency === 'USD' ? '$' : '₹';
                          const amountText = `${symbol}${debt.amount.toFixed(2)}`;

                          return (
                            <div key={`${m.id}-${debt.currency}-${idx}`} className="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0 gap-3">
                              <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white select-none uppercase"
                                     style={{ backgroundColor: ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c'][m.name.charCodeAt(0) % 6] }}>
                                  {m.name[0]}
                                </div>
                                <div className="text-left leading-tight">
                                  <h4 className="text-xs font-extrabold text-white">{m.name}</h4>
                                  <p className={`text-[10px] mt-0.5 font-bold ${isMePayer ? 'text-red-400' : 'text-emerald-400'}`}>
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
                                    className="px-3.5 py-1.5 bg-[#10b981] hover:bg-emerald-400 text-slate-950 text-[10px] font-extrabold rounded-full transition-all cursor-pointer border-none shadow-sm"
                                  >
                                    Pay Now
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleOpenReminder(m, debt.amount, debt.currency)}
                                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-extrabold rounded-full transition-all cursor-pointer"
                                  >
                                    Remind
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        });
                      }

                      return (
                        <div key={m.id} className="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0 gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white select-none uppercase"
                                 style={{ backgroundColor: ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c'][m.name.charCodeAt(0) % 6] }}>
                              {m.name[0]}
                            </div>
                            <div className="text-left leading-tight">
                              <h4 className="text-xs font-extrabold text-white">{m.name}</h4>
                              <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">Flatmate is settled</p>
                            </div>
                          </div>

                          <div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                              Settled
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </aside>
          )}

          {/* Main Column */}
          {activeView !== 'members' && (
            <section className={`flex-col gap-6 ${activeView === 'settlements' ? 'w-full flex' : 'flex-1 flex'}`}>
              
              {/* Action Header block */}
              {activeView === 'expenses' ? (
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-left">
                  <h2 className="text-2xl font-extrabold text-white tracking-tight">
                    Expense History
                  </h2>
                  <button
                    onClick={openGenericExpenseModal}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#10b981] hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition-all shadow-lg shadow-emerald-500/20 cursor-pointer border-none transform hover:-translate-y-0.5"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Expense</span>
                  </button>
                </div>
              ) : activeView === 'settlements' ? (
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-left">
                  <h2 className="text-2xl font-extrabold text-white tracking-tight">
                    Settlements History
                  </h2>
                  <button
                    onClick={openGenericSettlementModal}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#10b981] hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition-all shadow-lg shadow-emerald-500/20 cursor-pointer border-none transform hover:-translate-y-0.5"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Settle Up</span>
                  </button>
                </div>
              ) : null}

              {/* Month Timeline / Settlements List */}
              {activeView === 'expenses' ? (
                expenses.length === 0 ? (
                  <div className="flex flex-col">
                    <div className="stitch-glass-card rounded-3xl p-14 text-center border border-emerald-900/60 bg-[#0b1610]/95 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.06)_0%,transparent_70%)] pointer-events-none"></div>
                      
                      {/* Floating notes graphic */}
                      <div className="relative w-24 h-24 mb-6 bg-emerald-950/80 rounded-full border border-emerald-800/60 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                        <div className="animate-bounce" style={{ animationDuration: '3.5s' }}>
                          <Wallet className="h-10 w-10 text-emerald-400" />
                        </div>
                      </div>

                      <h3 className="text-xl font-extrabold text-white mb-2 tracking-tight">This group has no expenses yet</h3>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto mb-8 leading-relaxed font-medium">
                        Start tracking shared expenses with your flatmates by adding an expense manually or importing a statement.
                      </p>

                      <button
                        onClick={openGenericExpenseModal}
                        className="px-7 py-3 rounded-full bg-[#10b981] hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-xl shadow-emerald-500/20 cursor-pointer border-none transform hover:-translate-y-0.5"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add Expense</span>
                      </button>
                    </div>
                  </div>
                ) : filteredExpenses.length === 0 ? (
                  <div className="stitch-glass-card rounded-3xl border border-slate-800 p-12 text-center shadow-md max-w-xl mx-auto my-8 flex flex-col items-center justify-center">
                    <span className="text-4xl block mb-4 select-none">🔍</span>
                    <h3 className="text-base font-extrabold text-white mb-2">No matching expenses found</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5">
                      Try adjusting your keywords or clearing the search query to view all expenses.
                    </p>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="px-5 py-2.5 bg-[#10b981] hover:bg-emerald-400 text-slate-950 rounded-full font-extrabold text-xs transition-all shadow-sm cursor-pointer border-none"
                    >
                      Clear Search
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.keys(groupedExpenses).map((monthLabel) => (
                      <div key={monthLabel} className="month-group">
                        <h4 className="month-label uppercase font-extrabold tracking-wider text-emerald-400 text-xs pb-2 border-b border-slate-800 mb-3 text-left">
                          {monthLabel}
                        </h4>
                        <div className="space-y-3">
                          {groupedExpenses[monthLabel].map((exp) => (
                            <ExpenseRow 
                              key={exp.id}
                              expense={exp}
                              currentUserId={user.id}
                              membersCount={members.length}
                              onClick={() => handleOpenExpenseDetails(exp)}
                              onDelete={(expenseId) => handleDeleteExpense(expenseId)}
                              isDark={true}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                settlements.length === 0 ? (
                  <div className="stitch-glass-card rounded-3xl border border-emerald-900/60 bg-[#0b1610]/95 p-14 text-center shadow-xl max-w-xl mx-auto my-8">
                    <span className="text-5xl block mb-4 select-none">🤝</span>
                    <h3 className="text-lg font-extrabold text-white mb-2">This group has no settlements yet</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
                      Record a settle up transaction between group members to clear off outstanding balances.
                    </p>
                  </div>
                ) : (
                  <div className="stitch-glass-card border border-emerald-900/60 bg-[#0b1610]/95 px-6 py-5 rounded-3xl shadow-xl">
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

                        return (
                          <div
                            key={set.id}
                            className="bg-slate-900/80 border border-slate-800 px-5 py-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-white text-left shadow-sm hover:bg-slate-800/80 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <span className="text-xl select-none mt-0.5">🤝</span>
                              <div className="leading-tight text-left">
                                <p className="font-bold text-white text-sm">
                                  <strong className="text-emerald-400">{set.payer?.name || 'Someone'}</strong> paid <strong className="text-white">{set.payee?.name || 'Someone'}</strong>
                                </p>
                                <p className="text-[10px] text-slate-400 mt-1.5 font-semibold">
                                  {formattedDate} · <span className="uppercase text-emerald-400 font-bold">{paymentMethodLabel}</span>
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3.5 sm:self-center self-end">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border bg-emerald-950 text-emerald-400 border-emerald-800/60">
                                {statusLabel}
                              </span>
                              <span className="font-black text-emerald-400 text-base bg-emerald-950/60 border border-emerald-800/40 px-3.5 py-1 rounded-xl">
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
        </div>

        {/* EXPENSE DETAIL MODAL */}
        {selectedExpense && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 select-none">
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
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
            </div>
          </div>
        )}

        {/* BALANCE DRILLDOWN MODAL */}
        {drilldownMember && (
          <BalanceDrilldownModal
            member={drilldownMember.member}
            balance={drilldownMember.balance}
            expenses={expenses}
            settlements={settlements}
            members={members}
            currentUserId={user.id}
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 select-none">
          <div className="stitch-glass-card border border-emerald-900/60 bg-[#0b1610]/95 p-8 rounded-3xl w-full max-w-md shadow-2xl relative text-left space-y-5">
            <button
              onClick={() => setShowSettlementModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-900 transition-colors bg-transparent border-none cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <h3 className="text-xl font-extrabold text-white tracking-tight mb-1">Record Settle Up</h3>
              <p className="text-xs text-slate-400 font-medium">Record a direct cash/UPI payment made between friends.</p>
            </div>

            {settleError && (
              <div className="bg-red-950/80 border border-red-900 text-red-300 p-3.5 rounded-2xl text-xs font-semibold">
                {settleError}
              </div>
            )}

            <form onSubmit={handleRecordSettlement} className="space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-300 mb-1.5 tracking-wider">Sender (Paid By)</label>
                <select
                  value={settlePayer}
                  onChange={(e) => setSettlePayer(e.target.value)}
                  className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                >
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-300 mb-1.5 tracking-wider">Recipient (Paid To)</label>
                <select
                  value={settlePayee}
                  onChange={(e) => setSettlePayee(e.target.value)}
                  className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                >
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[11px] font-extrabold uppercase text-slate-300 mb-1.5 tracking-wider">Amount</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-300 mb-1.5 tracking-wider">Currency</label>
                  <select
                    value={settleCurrency}
                    onChange={(e) => setSettleCurrency(e.target.value)}
                    className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    <option value="INR">INR (₹)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-300 mb-1.5 tracking-wider">
                  Payment Method
                </label>
                <select
                  value={settlePaymentMethod}
                  onChange={(e) => setSettlePaymentMethod(e.target.value)}
                  className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-300 mb-1.5 tracking-wider">
                  Optional Notes
                </label>
                <textarea
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  placeholder="Add payment context (e.g. sent via GPay)"
                  rows={2}
                  className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={settleLoading}
                className="w-full mt-4 py-3.5 bg-[#10b981] hover:bg-emerald-400 text-slate-950 font-extrabold rounded-full shadow-lg shadow-emerald-500/20 transition-all cursor-pointer text-xs disabled:opacity-50 border-none"
              >
                {settleLoading ? 'Recording...' : 'Save Settlement'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ADD EXPENSE MODAL */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 select-none">
          <div className="stitch-glass-card border border-emerald-900/60 bg-[#0b1610]/95 p-8 rounded-3xl w-full max-w-lg shadow-2xl relative text-left max-h-[90vh] overflow-y-auto space-y-5">
            <button
              onClick={() => setShowExpenseModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-900 transition-colors bg-transparent border-none cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <h3 className="text-xl font-extrabold text-white tracking-tight mb-1">Add Shared Expense</h3>
              <p className="text-xs text-slate-400 font-medium">Enter a bill or shared transaction to split among flatmates.</p>
            </div>

            {expenseError && (
              <div className="bg-red-950/80 border border-red-900 text-red-300 p-3.5 rounded-2xl text-xs font-semibold">
                {expenseError}
              </div>
            )}

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[11px] font-extrabold uppercase text-slate-300 mb-1.5 tracking-wider">Description</label>
                  <input
                    type="text"
                    required
                    value={expDescription}
                    onChange={(e) => setExpDescription(e.target.value)}
                    placeholder="e.g. Groceries BigBasket"
                    className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-300 mb-1.5 tracking-wider">Currency</label>
                  <select
                    value={expCurrency}
                    onChange={(e) => setExpCurrency(e.target.value)}
                    className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    <option value="INR">INR (₹)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-300 mb-1.5 tracking-wider">Total Cost ({currencySymbol})</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-300 mb-1.5 tracking-wider">Paid By</label>
                  <select
                    value={expPayer}
                    onChange={(e) => setExpPayer(e.target.value)}
                    className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-300 mb-1.5 tracking-wider">Split Method</label>
                <select
                  value={expSplitType}
                  onChange={(e) => setExpSplitType(e.target.value)}
                  className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="equal">Split Equally</option>
                  <option value="unequal">Unequally (exact values)</option>
                  <option value="percentage">By Percentages (%)</option>
                  <option value="share">By Shares (ratios)</option>
                </select>
              </div>

              {/* Dynamic split input tables depending on split type */}
              <div className="border-t border-slate-800 pt-4">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2.5">Split Participants Details</p>
                <div className="space-y-3 bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
                  {members.map(m => {
                    if (expSplitType === 'equal') {
                      return (
                        <div key={m.id} className="flex items-center gap-3 text-xs">
                          <input
                            type="checkbox"
                            checked={!!splitCheckboxes[m.id]}
                            onChange={() => handleCheckboxChange(m.id)}
                            className="rounded accent-emerald-500 h-4 w-4"
                          />
                          <span className="font-bold text-white">{m.name}</span>
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
                        <span className="font-bold text-white">{m.name}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder={placeholder}
                            value={customSplitInputs[m.id] || ''}
                            onChange={(e) => handleCustomSplitInputChange(m.id, e.target.value)}
                            className="w-24 bg-[#0f172a] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-right font-medium"
                          />
                          <span className="text-[10px] font-extrabold text-slate-400 w-8">{suffix}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={expenseLoading}
                className="w-full mt-4 py-3.5 bg-[#10b981] hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-full shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50 border-none"
              >
                {expenseLoading ? 'Saving Expense...' : 'Save Expense'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Invite Member modal block */}
      {showMemberForm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 select-none">
          <div className="stitch-glass-card border border-emerald-900/60 bg-[#0b1610]/95 p-8 rounded-3xl w-full max-w-md shadow-2xl relative text-left space-y-5">
            <button
              onClick={() => {
                setShowMemberForm(false);
                setNewMemberEmail('');
                setMemberError('');
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-900 transition-colors bg-transparent border-none cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="pb-3 border-b border-slate-800">
              <h3 className="text-xl font-extrabold text-white tracking-tight mb-1">
                Invite New Flatmate
              </h3>
              <p className="text-xs text-slate-400 font-medium">Send an invitation to join this shared ledger.</p>
            </div>

            {memberError && (
              <div className="bg-red-950/80 border border-red-900 text-red-300 p-3.5 rounded-2xl text-xs font-semibold">
                {memberError}
              </div>
            )}

            <form onSubmit={handleInviteMember} className="space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-300 mb-1.5 tracking-wider">Email Address</label>
                <input
                  type="email"
                  required
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="e.g. flatmate@example.com"
                  className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="flex justify-end items-center gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowMemberForm(false);
                    setNewMemberEmail('');
                    setMemberError('');
                  }}
                  className="px-5 py-2.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-900 text-xs font-bold transition-all cursor-pointer bg-transparent border-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={memberLoading}
                  className="px-6 py-2.5 bg-[#10b981] hover:bg-emerald-400 text-slate-950 text-xs font-extrabold rounded-full shadow-lg shadow-emerald-500/20 cursor-pointer border-none disabled:opacity-50 transition-all"
                >
                  {memberLoading ? 'Sending...' : 'Invite Flatmate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
