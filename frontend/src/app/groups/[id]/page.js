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
import { ArrowLeft, RefreshCw, Trash2, FileSpreadsheet, UserPlus, Info, ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';
import Layout from '@/components/Layout';


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

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

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
    setShowExpenseModal(true);
  };

  const openGenericSettlementModal = () => {
    if (user && members.length > 0) {
      setSettlePayer(user.id);
      const alternative = members.find((m) => m.id !== user.id);
      setSettlePayee(alternative ? alternative.id : '');
      setSettleAmount('');
      setSettleCurrency('INR');
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
    if (isNaN(amt) || amt <= 0) {
      setSettleError('Amount must be positive');
      return;
    }

    setSettleLoading(true);
    try {
      await recordSettlement(groupId, settlePayer, settlePayee, amt, settleCurrency);
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
    if (isNaN(totalAmt) || totalAmt <= 0) {
      setExpenseError('Total amount must be positive');
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
      await addExpense(groupId, expPayer, expDescription.trim(), totalAmt, expSplitType, splits, expCurrency);
      setShowExpenseModal(false);
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

  if (loading || (pageLoading && !group)) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading group ledger...</p>
      </div>
    );
  }

  const groupedExpenses = groupExpensesByMonth(expenses);
  const currencySymbol = expCurrency === 'USD' ? '$' : '₹';
  const myNetINR = balances.netBalancesByCurrency?.INR?.[user.id] || 0;
  const myNetUSD = balances.netBalancesByCurrency?.USD?.[user.id] || 0;

  return (
    <Layout>
      <div className="w-full flex-1 flex flex-col bg-grey-bg overflow-hidden h-full">
        {/* Top Header Bar */}
        <div className="bg-white border-b border-border-custom px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0 text-left">
          <div className="flex items-center space-x-4">
            <div className="text-left">
              <h1 className="text-xl font-bold text-text-primary tracking-tight">{group.name}</h1>
              <p className="text-xs text-text-muted mt-0.5">Ledger details and balances</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={loadData}
              disabled={pageLoading}
              className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-grey-bg transition-all cursor-pointer bg-transparent border-none"
              title="Refresh ledger"
            >
              <RefreshCw className={`h-4 w-4 ${pageLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleDeleteGroup}
              className="flex items-center space-x-2 px-3 py-2 rounded-xl text-red-owe hover:text-white hover:bg-red-50/20 border border-red-500/20 hover:border-red-500/40 transition-all text-xs font-semibold cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Delete Group</span>
            </button>

            {activeView === 'expenses' && (
              <button
                onClick={() => router.push(`/groups/${groupId}/import`)}
                className="flex items-center space-x-2 px-3 py-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-grey-bg border border-border-custom hover:border-text-primary/30 transition-all text-xs font-semibold cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span className="hidden sm:inline">Import CSV</span>
              </button>
            )}

            {activeView === 'members' && (
              <button
                onClick={() => setShowMemberForm(!showMemberForm)}
                className="flex items-center space-x-2 px-3 py-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-grey-bg border border-border-custom hover:border-text-primary/30 transition-all text-xs font-semibold cursor-pointer"
              >
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Invite Member</span>
              </button>
            )}

            {activeView === 'settlements' && (
              <button
                onClick={openGenericSettlementModal}
                className="flex items-center space-x-2 px-3 py-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-grey-bg border border-border-custom hover:border-text-primary/30 transition-all text-xs font-semibold cursor-pointer"
              >
                <span>$</span>
                <span className="hidden sm:inline">Settle Up</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Body Grid */}
        <div className="page-body overflow-y-auto flex-1">
        
        {/* Invite Member form block (inline dropdown when toggled) */}
        {showMemberForm && (
          <div className="mb-6 bg-white border border-border-custom rounded-2xl p-5 max-w-md mx-auto shadow-sm text-left">
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
                  className="w-full bg-grey-bg border border-border-custom rounded-xl px-3.5 py-2.5 text-text-primary placeholder-text-muted focus:outline-none focus:border-green-pri text-xs"
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
                  className="px-4 py-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-grey-bg text-xs font-semibold transition-all cursor-pointer"
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
        )}

        {/* Two column layout */}
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Left Column (w-full md:w-80 or centered max-w-xl based on activeView) */}
          <aside className={activeView === 'expenses' ? "w-full md:w-80 flex-shrink-0 flex flex-col gap-6" : "w-full max-w-xl mx-auto flex flex-col gap-6"}>
            
            {/* 1. MY GROUP BALANCE card */}
            {activeView === 'expenses' && (
              <div className="bg-white border border-border-custom rounded-3xl p-6 shadow-sm text-left relative overflow-hidden">
                <div className="absolute top-[-30%] right-[-10%] h-[120px] w-[120px] rounded-full bg-green-pri/5 blur-[40px] pointer-events-none"></div>
                <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-wider">My Group Balance</h3>
                
                <div className="flex flex-col gap-1.5 mt-3">
                  <div className={`text-xl font-extrabold tracking-tight ${
                    myNetINR > 0.01 
                      ? 'text-green-owed' 
                      : myNetINR < -0.01 
                      ? 'text-red-owe' 
                      : 'text-text-muted'
                  }`}>
                    {myNetINR > 0.01 ? '+' : ''}
                    ₹{myNetINR.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-semibold text-text-muted">INR</span>
                  </div>
                  <div className={`text-xl font-extrabold tracking-tight ${
                    myNetUSD > 0.01 
                      ? 'text-green-owed' 
                      : myNetUSD < -0.01 
                      ? 'text-red-owe' 
                      : 'text-text-muted'
                  }`}>
                    {myNetUSD > 0.01 ? '+' : ''}
                    ${myNetUSD.toFixed(2)} <span className="text-xs font-semibold text-text-muted">USD</span>
                  </div>
                </div>
                
                <button
                  onClick={openGenericSettlementModal}
                  className="w-full mt-5 py-2.5 bg-green-pri hover:bg-green-light text-white font-bold rounded-xl text-sm transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 border-none"
                >
                  <span>$</span>
                  <span>Record Settle Up</span>
                </button>
              </div>
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
              <div className="flex items-center justify-between pb-3 border-b border-border-custom text-left">
                <h2 className="text-xl font-bold text-text-primary">Transaction History</h2>
                <button
                  onClick={openGenericExpenseModal}
                  className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-green-pri hover:bg-green-light text-white shadow-xs font-bold text-sm transition-all cursor-pointer border-none"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Expense</span>
                </button>
              </div>

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
              {expenses.length === 0 && settlements.length === 0 ? (
                <div className="bg-white rounded-3xl border border-border-custom p-16 text-center shadow-sm max-w-xl mx-auto my-12 text-left">
                  <span className="text-5xl block mb-4 select-none">💸</span>
                  <h3 className="text-lg font-extrabold text-text-primary mb-2">This group has no expenses yet</h3>
                  <p className="text-xs text-text-muted max-w-sm mx-auto mb-6">
                    Start tracking shared expenses with your flatmates by importing a CSV file or adding an expense manually.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button
                      onClick={() => router.push(`/groups/${groupId}/import`)}
                      className="w-full sm:w-auto px-5 py-3 border border-border-custom hover:bg-slate-50 text-text-primary rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer bg-white"
                    >
                      📁 Import CSV
                    </button>
                    <button
                      onClick={openGenericExpenseModal}
                      className="w-full sm:w-auto px-5 py-3 bg-green-pri hover:bg-green-light text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer border-none"
                    >
                      ➕ Add Manually
                    </button>
                  </div>
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

                          return (
                            <div
                              key={exp.id}
                              onClick={() => handleOpenExpenseDetails(exp)}
                              className="group flex items-center justify-between p-5 bg-white hover:bg-grey-light/50 border border-border-custom hover:border-green-pri/30 rounded-2xl transition-all cursor-pointer shadow-sm"
                            >
                              <div className="flex items-center gap-3.5">
                                {/* Circle icon with info */}
                                <div className="h-10 w-10 rounded-full bg-grey-bg border border-border-custom flex items-center justify-center text-text-muted">
                                  <Info className="h-5 w-5" />
                                </div>
                                <div className="text-left">
                                  <h4 className="font-bold text-text-primary text-base group-hover:text-green-pri transition-colors">
                                    {exp.description}
                                  </h4>
                                  <p className="text-sm text-text-muted mt-0.5">
                                    Paid by {payerName} · {new Date(exp.created_at || exp.date).toLocaleDateString('en-US')}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-4">
                                {/* Currency label badge */}
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

                  {/* Settlements trail timeline list */}
                  {settlements.length > 0 && (
                    <div className="month-group pt-4 border-t border-border-custom">
                      <h4 className="month-label uppercase font-bold tracking-wider text-text-muted text-sm pb-2 border-b border-border-custom mb-3 text-left">
                        Settlements Trail
                      </h4>
                      <div className="space-y-2">
                        {settlements.map((set) => {
                          const currencySym = set.currency === 'USD' ? '$' : '₹';
                          return (
                            <div
                              key={set.id}
                              className="bg-white border border-border-custom px-4 py-3.5 rounded-2xl flex justify-between items-center text-sm text-text-primary text-left shadow-sm hover:bg-grey-light/50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-lg select-none">🤝</span>
                                <div>
                                  <p className="font-semibold text-text-primary text-sm leading-tight">
                                    <strong>{set.payer?.name || 'Someone'}</strong> paid <strong>{set.payee?.name || 'Someone'}</strong>
                                  </p>
                                  <p className="text-xs text-text-muted mt-1 leading-none">
                                    Recorded on {new Date(set.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </p>
                                </div>
                              </div>
                              <span className="font-bold text-green-owed text-base bg-green-bg border border-green-pri/10 px-3 py-1 rounded-xl">
                                {currencySym}{parseFloat(set.amount).toFixed(2)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
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
                    step="any"
                    required
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    placeholder="0.00"
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
                    step="any"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    placeholder="0.00"
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
                            step="any"
                            placeholder={placeholder}
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
      </div>
    </Layout>
  );
}
