'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchUserGroups, createGroup, calculateBalancesAndDebts, deleteGroup, fetchUserAllExpenses, fetchGroupExpenses } from '@/lib/api';
import { Plus, LogOut, Users, User, ArrowUpRight, ArrowDownLeft, RefreshCw, FileSpreadsheet, Trash2, Search, Sparkles, ChevronDown, UserPlus, Wallet, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import CsvImporter from '@/components/CsvImporter';
import Layout from '@/components/Layout';
import Header from '@/components/Header';
import FinancialPulseChart from '@/components/FinancialPulseChart';
import Avatar from '@/components/ui/Avatar';

function formatTimestamp(dateStr) {
  if (!dateStr) return 'Recently';
  const d = new Date(dateStr);
  const now = new Date();
  const diffHours = Math.floor((now - d) / (1000 * 60 * 60));
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `Today, ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function DashboardContent() {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [groups, setGroups] = useState([]);
  const [groupBalances, setGroupBalances] = useState({});
  const [groupLastUpdated, setGroupLastUpdated] = useState({});
  const [allExpenses, setAllExpenses] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Pending settlements count state
  const [pendingSettlementsCount, setPendingSettlementsCount] = useState(0);

  // Timeframe dropdown state
  const [headerTimeframe, setHeaderTimeframe] = useState('Last 30 Days');
  const [isHeaderTimeframeOpen, setIsHeaderTimeframeOpen] = useState(false);

  // AI Modal state
  const [isAiModalOpen, setIsAiModalOpen] = useState(searchParams.get('ai') === 'open');

  // Create group modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  // CSV Import state
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    const hasOAuthParams = typeof window !== 'undefined' && (
      window.location.hash.includes('access_token=') ||
      window.location.search.includes('code=')
    );
    if (!loading && !user && !hasOAuthParams) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      const userGroups = await fetchUserGroups(user.id);
      setGroups(userGroups);

      // Fetch all expenses across user groups for chart and spending metrics
      const userExpenses = await fetchUserAllExpenses(user.id);
      setAllExpenses(userExpenses);

      // Fetch balances and last updated timestamp for each group
      const balances = {};
      const updatedMap = {};
      let settlementCount = 0;

      await Promise.all(
        userGroups.map(async (g) => {
          try {
            const groupData = await calculateBalancesAndDebts(g.id);
            const exps = await fetchGroupExpenses(g.id);

            let latestDate = g.created_at;
            if (exps && exps.length > 0) {
              latestDate = exps[0].created_at;
            }
            updatedMap[g.id] = formatTimestamp(latestDate);

            balances[g.id] = {
              consolidated: groupData.netBalances[user.id] || 0,
              INR: groupData.netBalancesByCurrency?.INR?.[user.id] || 0,
              USD: groupData.netBalancesByCurrency?.USD?.[user.id] || 0,
              member_count: groupData.members?.length || 1,
              members: groupData.members || [],
            };

            if (groupData.simplifiedDebts) {
              groupData.simplifiedDebts.forEach((debt) => {
                if (debt.from === user.id || debt.to === user.id) {
                  settlementCount++;
                }
              });
            }
          } catch (err) {
            console.error(`Error calculating balance for group ${g.id}:`, err);
            balances[g.id] = { consolidated: 0, INR: 0, USD: 0, member_count: 1, members: [] };
            updatedMap[g.id] = 'Recently';
          }
        })
      );
      setGroupBalances(balances);
      setGroupLastUpdated(updatedMap);
      setPendingSettlementsCount(settlementCount);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setModalError('');
    if (!newGroupName.trim()) {
      setModalError('Group name is required');
      return;
    }

    setModalLoading(true);
    try {
      const group = await createGroup(newGroupName.trim(), user.id);
      setIsModalOpen(false);
      setNewGroupName('');
      await loadData();
      router.push(`/groups/${group.id}`);
    } catch (err) {
      setModalError(err.message || 'Failed to create group');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteGroup = async (e, groupId, groupName) => {
    e.preventDefault();
    e.stopPropagation();
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${groupName}"? All transaction logs and splits will be permanently erased.`
    );
    if (!confirmDelete) return;

    try {
      await deleteGroup(groupId);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete group.');
    }
  };

  // Calculate overall balances from real group data
  let totalOwedINR = 0;
  let totalOweINR = 0;
  let totalOwedUSD = 0;
  let totalOweUSD = 0;
  
  Object.values(groupBalances).forEach((bal) => {
    const inr = bal.INR || 0;
    if (inr > 0) totalOwedINR += inr;
    else if (inr < 0) totalOweINR += Math.abs(inr);

    const usd = bal.USD || 0;
    if (usd > 0) totalOwedUSD += usd;
    else if (usd < 0) totalOweUSD += Math.abs(usd);
  });

  const overallBalanceINR = totalOwedINR - totalOweINR;

  // Helper to extract logged-in user's personal calculated expense share
  const getUserExpenseShare = (e) => {
    if (!e || !user) return 0;
    const splits = e.expense_splits || e.splits || [];
    if (splits.length > 0) {
      const userSplit = splits.find((s) => String(s.user_id || s.userId) === String(user.id));
      if (userSplit) {
        return parseFloat(userSplit.amount || 0);
      }
      return 0;
    }
    const payerId = e.paid_by?.id || e.paid_by;
    if (String(payerId) === String(user.id)) {
      return parseFloat(e.amount || 0);
    }
    return 0;
  };

  // Calculate actual total spent by the logged-in user in INR across all user expenses
  const totalSpentINR = allExpenses.reduce((sum, e) => {
    const share = getUserExpenseShare(e);
    return sum + share * (e.currency === 'USD' ? 83 : 1);
  }, 0);

  const monthlyLimit = 20000;
  const monthlySavingsINR = Math.max(0, monthlyLimit - totalSpentINR);

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading || !user) {
    return (
      <div className="loading-screen bg-[#0b130e]">
        <div className="loading-spinner border-t-emerald-500"></div>
        <p className="loading-text text-slate-400">Loading your session...</p>
      </div>
    );
  }

  return (
    <Layout>
      <div className="stitch-dashboard-dark w-full flex-1 flex flex-col min-h-screen overflow-x-hidden text-left select-none">
        
        {/* Top Header Bar */}
        <Header 
          isDark={true}
          placeholder="Search transactions or groups..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        >
          {/* Header Action Buttons matching Stitch screenshot */}
          <div className="flex items-center gap-3">
            {/* Invite Member Button */}
            <button
              onClick={() => {
                if (groups.length > 0) {
                  router.push(`/groups/${groups[0].id}?tab=members`);
                } else {
                  setIsModalOpen(true);
                }
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <UserPlus className="h-3.5 w-3.5 text-slate-300" />
              <span>Invite Member</span>
            </button>

            {/* Analyze with AI Button (Glow Gradient Pill) */}
            <button
              onClick={() => setIsAiModalOpen(true)}
              className="stitch-ai-button flex items-center gap-2 px-4 py-1.5 text-white text-xs font-extrabold rounded-full cursor-pointer shadow-lg border-none"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Analyze with AI</span>
            </button>
          </div>
        </Header>

        {/* Scrollable Dashboard Body */}
        <div className="flex-1 space-y-6 px-6 md:px-8 py-6 max-w-7xl mx-auto w-full">
          
          {/* Dashboard Section Title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Dashboard</h1>
              <p className="text-xs text-slate-400 font-semibold mt-1">Financial Pulse Overview</p>
            </div>
          </div>

          {/* Financial Pulse Chart Card Component (Connected to Real Expenses) */}
          <FinancialPulseChart expenses={allExpenses} currentUserId={user?.id} monthlyLimit={monthlyLimit} />

          {/* 5 Metrics Summary Cards Row (Driven by Real Ledger Data) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            
            {/* Card 1: Overall Balance */}
            <div className="stitch-glass-card rounded-2xl p-4 flex flex-col justify-between">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Overall Balance</p>
              <div className="mt-2">
                <p className={`text-xl font-extrabold tracking-tight ${
                  overallBalanceINR > 0 ? 'text-emerald-400' : overallBalanceINR < 0 ? 'text-red-400' : 'text-white'
                }`}>
                  ₹{overallBalanceINR.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Card 2: You Are Owed */}
            <div className="stitch-glass-card rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">You Are Owed</p>
                <span className="stitch-badge-green text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {totalOwedINR > 0 ? '↑ Live' : '0%'}
                </span>
              </div>
              <div className="mt-2">
                <p className="text-xl font-extrabold text-emerald-400 tracking-tight">
                  ₹{totalOwedINR.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Card 3: You Owe */}
            <div className="stitch-glass-card rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">You Owe</p>
                <span className="stitch-badge-red text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {totalOweINR > 0 ? '↓ Live' : '0%'}
                </span>
              </div>
              <div className="mt-2">
                <p className="text-xl font-extrabold text-red-400 tracking-tight">
                  ₹{totalOweINR.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Card 4: Pending Settlements */}
            <div className="stitch-glass-card rounded-2xl p-4 flex flex-col justify-between">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Pending Settlements</p>
              <div className="mt-2">
                <p className="text-xl font-extrabold text-white tracking-tight">
                  {pendingSettlementsCount}
                </p>
              </div>
            </div>

            {/* Card 5: Monthly Savings */}
            <div className="stitch-glass-card rounded-2xl p-4 flex flex-col justify-between">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Monthly Budget Remaining</p>
              <div className="mt-2">
                <p className="text-xl font-extrabold text-emerald-400 tracking-tight">
                  ₹{monthlySavingsINR.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

          </div>

          {/* Main Full-Width Section: Your Groups */}
          <div className="w-full space-y-4 pt-2">
            
            {/* Your Groups Bar */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-400" />
                <h2 className="text-lg font-extrabold text-white tracking-tight">Your Groups</h2>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCsvImportOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Import CSV</span>
                </button>

                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all cursor-pointer border-none shadow-md"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Group</span>
                </button>
              </div>
            </div>

            {/* Group Cards List (Full Width Expanded Rows) */}
            {dataLoading && groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 stitch-glass-card rounded-2xl">
                <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-slate-400 text-xs font-semibold">Loading groups...</p>
              </div>
            ) : groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 stitch-glass-card rounded-2xl text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
                  <Users className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-white font-extrabold text-base">No groups created yet</h3>
                  <p className="text-slate-400 text-xs max-w-sm mx-auto font-medium">
                    Create your first group to manage shared rent, dinners, or trip expenses.
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all cursor-pointer border-none shadow-lg"
                >
                  Create your first group
                </button>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="p-8 stitch-glass-card rounded-2xl text-center">
                <p className="text-slate-400 text-xs font-semibold">No groups matching &quot;{searchQuery}&quot;</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredGroups.map((group) => {
                  const balance = groupBalances[group.id] || { consolidated: 0, INR: 0, USD: 0, member_count: 1, members: [] };
                  const inrVal = balance.INR || 0;
                  
                  let badgeClass = "stitch-badge-neutral";
                  let badgeText = "SETTLED UP";
                  
                  if (balance.consolidated > 0.01) {
                    badgeClass = "stitch-badge-green";
                    badgeText = "YOU ARE OWED";
                  } else if (balance.consolidated < -0.01) {
                    badgeClass = "stitch-badge-red";
                    badgeText = "YOU OWE";
                  }

                  const timeText = groupLastUpdated[group.id] || 'Recently';

                  return (
                    <div
                      key={group.id}
                      onClick={() => router.push(`/groups/${group.id}`)}
                      className="stitch-glass-card rounded-2xl p-4 transition-all duration-200 hover:bg-slate-900/80 cursor-pointer group flex flex-col md:grid md:grid-cols-12 md:gap-4 items-center w-full"
                    >
                      {/* Column 1-5: Group icon + Name & Balance Subtitle */}
                      <div className="md:col-span-5 flex items-center gap-4 w-full">
                        <div className="h-11 w-11 rounded-xl bg-emerald-950/80 border border-emerald-800/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
                          <Users className="h-5.5 w-5.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-extrabold text-white text-base group-hover:text-emerald-400 transition-colors truncate">
                              {group.name}
                            </h3>
                            <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full ${badgeClass}`}>
                              {badgeText}
                            </span>
                          </div>
                          <p className="text-xs font-bold mt-0.5">
                            <span className={inrVal > 0 ? 'text-emerald-400' : inrVal < 0 ? 'text-red-400' : 'text-slate-400'}>
                              {inrVal > 0 ? `+₹${inrVal.toLocaleString(undefined, { minimumFractionDigits: 2 })} Balance` : inrVal < 0 ? `-₹${Math.abs(inrVal).toLocaleString(undefined, { minimumFractionDigits: 2 })} Balance` : '₹0.00 Balance'}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Column 6-8: Last Updated */}
                      <div className="md:col-span-3 w-full text-left hidden md:block pl-2">
                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Last Updated</p>
                        <p className="text-xs font-semibold text-slate-200 mt-0.5">{timeText}</p>
                      </div>

                      {/* Column 9-11: Member Stack */}
                      <div className="md:col-span-3 w-full text-left flex flex-col justify-center">
                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Member Stack</p>
                        <div className="flex items-center -space-x-2">
                          {(balance.members && balance.members.length > 0 ? balance.members.slice(0, 4) : [{ name: user?.email?.split('@')[0] || 'User' }]).map((m, mIdx) => {
                            const memberName = typeof m === 'object' ? (m.name || m.email || 'User') : String(m);
                            const memberAvatar = typeof m === 'object' ? (m.avatar_url || m.picture) : null;
                            return (
                              <Avatar
                                key={mIdx}
                                name={memberName}
                                src={memberAvatar}
                                size={28}
                                className="border-2 border-[#0b1610] shadow-xs group-hover:border-emerald-950 transition-colors"
                              />
                            );
                          })}
                          {balance.members && balance.members.length > 4 && (
                            <div className="h-7 w-7 rounded-full bg-slate-800 border-2 border-[#0b1610] text-[10px] font-extrabold text-slate-300 flex items-center justify-center flex-shrink-0">
                              +{balance.members.length - 4}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Column 12: Delete Action Button */}
                      <div className="md:col-span-1 w-full flex justify-end">
                        <button
                          onClick={(e) => handleDeleteGroup(e, group.id, group.name)}
                          className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/70 text-red-400 border border-red-900/50 transition-all cursor-pointer opacity-80 group-hover:opacity-100"
                          title="Delete Group"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>

        </div>

        {/* AI ANALYSIS DEEP AUDIT MODAL */}
        {isAiModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in text-left">
            <div className="w-full max-w-lg stitch-glass-card rounded-2xl shadow-2xl p-6 space-y-5 border border-purple-500/40 bg-slate-950/95">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">SmartCash AI Financial Advisor</h3>
                    <p className="text-xs text-slate-400 font-semibold">Live Ledger Audit & Analytics</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAiModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer bg-transparent border-none font-bold"
                >
                  ✕
                </button>
              </div>

              {/* AI Report Content driven by real user totals */}
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <h4 className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Health Score: {totalSpentINR > 15000 ? '72 / 100' : '92 / 100'}</span>
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Total recorded spending across your active groups is <strong>₹{totalSpentINR.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> against your ₹20,000 limit.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-300">Live Insights</h4>
                  <ul className="space-y-2 text-xs text-slate-300 list-disc pl-4">
                    <li><strong>Active Groups</strong>: You are participating in {groups.length} group{groups.length !== 1 ? 's' : ''}.</li>
                    <li><strong>Collectibles</strong>: You have ₹{totalOwedINR.toLocaleString()} in pending claims from group members.</li>
                    <li><strong>Pending Settlements</strong>: {pendingSettlementsCount} debt settlement{pendingSettlementsCount !== 1 ? 's' : ''} require action.</li>
                  </ul>
                </div>
              </div>

              <button
                onClick={() => setIsAiModalOpen(false)}
                className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer border-none shadow-lg"
              >
                Close AI Insights
              </button>
            </div>
          </div>
        )}

        {/* Create Group Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in text-left">
            <div className="w-full max-w-md stitch-glass-card rounded-2xl shadow-2xl p-6 space-y-6 bg-slate-950 border border-emerald-900">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Create New Group</h3>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setNewGroupName('');
                    setModalError('');
                  }}
                  className="text-slate-400 hover:text-white cursor-pointer border-none bg-transparent font-bold"
                >
                  ✕
                </button>
              </div>

              {modalError && (
                <div className="p-3 rounded-lg bg-red-950/60 border border-red-800/60 text-red-400 text-xs font-semibold">
                  {modalError}
                </div>
              )}

              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div>
                  <label htmlFor="groupName" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Group Name
                  </label>
                  <input
                    id="groupName"
                    type="text"
                    required
                    placeholder="e.g. Apartment roommates, Europe trip"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all text-left"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setNewGroupName('');
                      setModalError('');
                    }}
                    className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white transition-all text-sm font-semibold border border-transparent cursor-pointer bg-transparent"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={modalLoading}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition-all text-sm font-bold shadow-md cursor-pointer border-none"
                  >
                    {modalLoading ? 'Creating...' : 'Create Group'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CSV IMPORT MODAL */}
        {isCsvImportOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto text-left">
            <div className="w-full max-w-4xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-6 max-h-[95vh] overflow-y-auto text-slate-100">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                    <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                    <span>CSV Expense Ingestion Wizard</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Parse and ingest historical expense logs into your ledger</p>
                </div>
                <button
                  onClick={() => setIsCsvImportOpen(false)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg border border-slate-800 cursor-pointer bg-transparent"
                >
                  ✕
                </button>
              </div>

              <CsvImporter 
                currentUserId={user.id} 
                onImportSuccess={(newGroupId) => {
                  setIsCsvImportOpen(false);
                  loadData();
                  router.push(`/groups/${newGroupId}`);
                }} 
              />
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}

export default function Dashboard() {
  return (
    <React.Suspense fallback={
      <div className="loading-screen bg-[#0b130e]">
        <div className="loading-spinner border-t-emerald-500"></div>
        <p className="loading-text text-slate-400">Loading dashboard...</p>
      </div>
    }>
      <DashboardContent />
    </React.Suspense>
  );
}
