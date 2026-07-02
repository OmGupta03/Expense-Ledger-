'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { fetchUserGroups, createGroup, calculateBalancesAndDebts, deleteGroup } from '@/lib/api';
import { Plus, LogOut, Users, User, ArrowUpRight, ArrowDownLeft, RefreshCw, FileSpreadsheet, Trash2 } from 'lucide-react';
import Link from 'next/link';
import CsvImporter from '@/components/CsvImporter';
import Layout from '@/components/Layout';

export default function Dashboard() {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();

  const [groups, setGroups] = useState([]);
  const [groupBalances, setGroupBalances] = useState({}); // groupId -> { consolidated, INR, USD, member_count }
  const [dataLoading, setDataLoading] = useState(true);
  
  // Create group modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  // CSV Import state
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);

  // Help modal state
  const [featureHelpModal, setFeatureHelpModal] = useState(null); // 'splits', 'instant', 'currency' or null

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      const userGroups = await fetchUserGroups(user.id);
      setGroups(userGroups);

      // Fetch balances for each group
      const balances = {};
      await Promise.all(
        userGroups.map(async (g) => {
          try {
            const groupData = await calculateBalancesAndDebts(g.id);
            balances[g.id] = {
              consolidated: groupData.netBalances[user.id] || 0,
              INR: groupData.netBalancesByCurrency?.INR?.[user.id] || 0,
              USD: groupData.netBalancesByCurrency?.USD?.[user.id] || 0,
              member_count: groupData.members?.length || 1,
            };
          } catch (err) {
            console.error(`Error calculating balance for group ${g.id}:`, err);
            balances[g.id] = { consolidated: 0, INR: 0, USD: 0, member_count: 1 };
          }
        })
      );
      setGroupBalances(balances);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
      // Reload groups list
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
      `Are you sure you want to delete "${groupName}"? All transaction logs, splits, and chat comments will be permanently erased.`
    );
    if (!confirmDelete) return;

    try {
      await deleteGroup(groupId);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete group.');
    }
  };

  const handleBalancesShortcut = () => {
    const groupsSection = document.getElementById('your-groups-section');
    if (groupsSection) {
      groupsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Calculate overall balances
  let totalOwedINR = 0;
  let totalOweINR = 0;
  let totalOwedUSD = 0;
  let totalOweUSD = 0;
  
  Object.values(groupBalances).forEach((bal) => {
    // INR
    const inr = bal.INR || 0;
    if (inr > 0) {
      totalOwedINR += inr;
    } else if (inr < 0) {
      totalOweINR += Math.abs(inr);
    }

    // USD
    const usd = bal.USD || 0;
    if (usd > 0) {
      totalOwedUSD += usd;
    } else if (usd < 0) {
      totalOweUSD += Math.abs(usd);
    }
  });

  const overallBalanceINR = totalOwedINR - totalOweINR;
  const overallBalanceUSD = totalOwedUSD - totalOweUSD;

  if (loading || !user) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading your session...</p>
      </div>
    );
  }

  return (
    <Layout>
      <div className="w-full flex-1 flex flex-col bg-grey-bg overflow-hidden h-full">
        {/* Top Header Bar */}
        <div className="bg-white border-b border-border-custom px-8 py-5 flex justify-between items-center flex-shrink-0 text-left">
          <div>
            <h1 className="text-xl font-bold text-text-primary tracking-tight">Dashboard</h1>
            <p className="text-xs text-text-muted mt-0.5">Manage your group expenses and settlements</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-green-pri hover:bg-green-light text-white font-bold rounded-xl shadow-sm transition-all cursor-pointer text-xs border-none"
          >
            <Plus className="h-4 w-4" />
            <span>Create Group</span>
          </button>
        </div>

        {/* Scrollable Dashboard Area */}
        <div className="page-body overflow-y-auto flex-1 space-y-8">
        
        {/* Profile details header card on mobile */}
        <div className="md:hidden flex items-center space-x-3 p-4 bg-white border border-border-custom rounded-2xl">
          <div className="h-10 w-10 rounded-full bg-grey-bg border border-border-custom flex items-center justify-center text-text-primary font-bold">
            {(profile?.name || user.email)[0].toUpperCase()}
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">{profile?.name || 'User'}</h3>
            <p className="text-xs text-text-muted">{user.email}</p>
          </div>
        </div>

        {/* 1. Balances Summary Panel */}
        <section className="relative overflow-hidden bg-white border border-border-custom rounded-3xl p-6 md:p-8 shadow-sm">
          {/* Subtle green decoration blobs */}
          <div className="absolute top-[-40%] right-[-10%] h-[180px] w-[180px] rounded-full bg-green-pri/5 blur-[60px] pointer-events-none"></div>
          <div className="absolute bottom-[-30%] left-[5%] h-[140px] w-[140px] rounded-full bg-green-pri/5 blur-[50px] pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider text-left">Overall Balance</h2>
                <div className="flex flex-col gap-2 mt-2 text-left">
                  <div className={`text-2xl md:text-3xl font-extrabold tracking-tight ${
                    overallBalanceINR > 0.01 
                      ? 'text-green-owed' 
                      : overallBalanceINR < -0.01 
                      ? 'text-red-owe' 
                      : 'text-text-primary'
                  }`}>
                    {overallBalanceINR > 0.01 ? '+' : ''}
                    ₹{overallBalanceINR.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-semibold text-text-muted">INR</span>
                  </div>
                  <div className={`text-2xl md:text-3xl font-extrabold tracking-tight ${
                    overallBalanceUSD > 0.01 
                      ? 'text-green-owed' 
                      : overallBalanceUSD < -0.01 
                      ? 'text-red-owe' 
                      : 'text-text-primary'
                  }`}>
                    {overallBalanceUSD > 0.01 ? '+' : ''}
                    ${overallBalanceUSD.toFixed(2)} <span className="text-xs font-semibold text-text-muted">USD</span>
                  </div>
                </div>
                <p className="text-xs text-text-muted mt-2 text-left">Net balances separated by currency across all your groups.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:flex items-center gap-6 md:gap-8 border-t md:border-t-0 md:border-l border-border-custom pt-6 md:pt-0 md:pl-8 text-left">
              <div className="space-y-2">
                <div className="flex items-center space-x-1 text-text-muted text-xs font-semibold uppercase tracking-wider">
                  <ArrowUpRight className="h-3.5 w-3.5 text-green-owed" />
                  <span>You are owed</span>
                </div>
                <div className="space-y-1">
                  <p className="text-base md:text-lg font-bold text-green-owed">₹{totalOwedINR.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p className="text-base md:text-lg font-bold text-green-owed">${totalOwedUSD.toFixed(2)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-1 text-text-muted text-xs font-semibold uppercase tracking-wider">
                  <ArrowDownLeft className="h-3.5 w-3.5 text-red-owe" />
                  <span>You owe</span>
                </div>
                <div className="space-y-1">
                  <p className="text-base md:text-lg font-bold text-red-owe">₹{totalOweINR.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p className="text-base md:text-lg font-bold text-red-owe">${totalOweUSD.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Group List Header */}
        <section id="your-groups-section" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-pri" />
              <h2 className="text-xl font-bold text-text-primary">Your Groups</h2>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={loadData}
                disabled={dataLoading}
                className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-white border border-border-custom bg-white disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                title="Refresh balances"
              >
                <RefreshCw className={`h-4 w-4 ${dataLoading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={() => setIsCsvImportOpen(true)}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white hover:bg-grey-light text-text-primary border border-border-custom shadow-xs font-semibold text-sm transition-all cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 text-green-pri" />
                <span>Import CSV</span>
              </button>

              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-green-pri hover:bg-green-light text-white shadow-xs font-semibold text-sm transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Create Group</span>
              </button>
            </div>
          </div>

          {/* Group Grid / List */}
          {dataLoading && groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white border border-border-custom rounded-2xl">
              <div className="w-6 h-6 border-2 border-green-pri border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-text-muted text-xs">Loading groups...</p>
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white border border-border-custom rounded-2xl text-center space-y-4 shadow-xs">
              <div className="h-12 w-12 rounded-full bg-grey-bg flex items-center justify-center text-text-muted border border-border-custom">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-text-primary font-bold text-base">No groups yet</h3>
                <p className="text-text-muted text-sm mt-1 max-w-sm mx-auto">Create a group to start splitting rent, dinner, or travel bills with friends.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-green-bg hover:bg-green-bg/85 border border-green-pri/20 text-green-pri font-semibold text-xs transition-all cursor-pointer"
              >
                Create your first group
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {groups.map((group) => {
                const balance = groupBalances[group.id] || { INR: 0, USD: 0 };
                return (
                  <div key={group.id} className="relative group/card">
                    <Link
                      href={`/groups/${group.id}`}
                      className="group flex items-center justify-between p-6 bg-white hover:bg-grey-light/45 border border-border-custom hover:border-green-pri/45 rounded-2xl transition-all duration-300 hover:-translate-y-0.5 shadow-sm hover:shadow-md pr-14"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 rounded-xl bg-grey-bg border border-border-custom flex items-center justify-center text-text-muted group-hover:bg-green-bg group-hover:text-green-pri transition-all duration-300 shadow-xs">
                          <Users className="h-5.5 w-5.5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-text-primary text-base group-hover:text-green-pri transition-colors text-left">
                            {group.name}
                          </h3>
                          <p className="text-text-muted text-xs mt-0.5 text-left">
                            Created {new Date(group.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex flex-col gap-1">
                        {/* Display INR */}
                        {(balance.INR > 0.01 || balance.INR < -0.01) && (
                          <div>
                            <p className="text-[9px] uppercase font-semibold tracking-wider text-text-muted">
                              {balance.INR > 0 ? 'owed' : 'owe'} (INR)
                            </p>
                            <p className={`font-extrabold text-xs mt-0.5 ${balance.INR > 0 ? 'text-green-owed' : 'text-red-owe'}`}>
                              ₹{Math.abs(balance.INR).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        )}
                        
                        {/* Display USD */}
                        {(balance.USD > 0.01 || balance.USD < -0.01) && (
                          <div>
                            <p className="text-[9px] uppercase font-semibold tracking-wider text-text-muted">
                              {balance.USD > 0 ? 'owed' : 'owe'} (USD)
                            </p>
                            <p className={`font-extrabold text-xs mt-0.5 ${balance.USD > 0 ? 'text-green-owed' : 'text-red-owe'}`}>
                              ${Math.abs(balance.USD).toFixed(2)}
                            </p>
                          </div>
                        )}

                        {/* Settled up */}
                        {Math.abs(balance.INR || 0) <= 0.01 && Math.abs(balance.USD || 0) <= 0.01 && (
                          <div>
                            <p className="text-[9px] uppercase font-semibold tracking-wider text-text-muted">settled up</p>
                            <p className="font-bold text-text-muted text-xs mt-0.5">₹0.00</p>
                          </div>
                        )}
                      </div>
                    </Link>

                    <button
                      onClick={(e) => handleDeleteGroup(e, group.id, group.name)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-owe hover:text-red-700 transition-all opacity-100 md:opacity-0 md:group-hover/card:opacity-100 focus:opacity-100 z-10 cursor-pointer"
                      title={`Delete ${group.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 3. Feature Cards Grid */}
        <section className="bg-white rounded-3xl border border-border-custom p-6 md:p-8 text-left shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted pb-4 border-b border-border-custom mb-6">
            Application Tools & Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Together */}
            <div 
              onClick={() => setIsModalOpen(true)}
              className="border border-border-custom p-5 rounded-xl hover:border-green-pri hover:-translate-y-0.5 hover:shadow-sm transition-all cursor-pointer text-left bg-grey-bg/25"
            >
              <span className="text-2xl bg-green-bg px-2.5 py-1.5 rounded-lg inline-block mb-3 select-none text-green-pri font-bold">👥</span>
              <h4 className="font-bold text-sm text-text-primary mb-1">Together</h4>
              <p className="text-xs text-text-muted leading-relaxed">
                Set up a shared flatmate or friend group to track rent, bills, and utilities.
              </p>
              <span className="text-[10px] font-bold text-green-pri block mt-4 hover:underline">
                Create Group →
              </span>
            </div>

            {/* Smart Splits */}
            <div 
              onClick={() => setFeatureHelpModal('splits')}
              className="border border-border-custom p-5 rounded-xl hover:border-green-pri hover:-translate-y-0.5 hover:shadow-sm transition-all cursor-pointer text-left bg-grey-bg/25"
            >
              <span className="text-2xl bg-green-bg px-2.5 py-1.5 rounded-lg inline-block mb-3 select-none text-green-pri font-bold">📊</span>
              <h4 className="font-bold text-sm text-text-primary mb-1">Smart Splits</h4>
              <p className="text-xs text-text-muted leading-relaxed">
                Split bills equally, unequally, by exact shares, or by percentage ratios.
              </p>
              <span className="text-[10px] font-bold text-green-pri block mt-4 hover:underline">
                Learn How →
              </span>
            </div>

            {/* Instant Calculations */}
            <div 
              onClick={() => setFeatureHelpModal('instant')}
              className="border border-border-custom p-5 rounded-xl hover:border-green-pri hover:-translate-y-0.5 hover:shadow-sm transition-all cursor-pointer text-left bg-grey-bg/25"
            >
              <span className="text-2xl bg-green-bg px-2.5 py-1.5 rounded-lg inline-block mb-3 select-none text-green-pri font-bold">⚡</span>
              <h4 className="font-bold text-sm text-text-primary mb-1">Instant</h4>
              <p className="text-xs text-text-muted leading-relaxed">
                Minimize transaction counts automatically with greedy debt reduction formulas.
              </p>
              <span className="text-[10px] font-bold text-green-pri block mt-4 hover:underline">
                Learn How →
              </span>
            </div>

            {/* CSV Import */}
            <div 
              onClick={() => setIsCsvImportOpen(true)}
              className="border border-border-custom p-5 rounded-xl hover:border-green-pri hover:-translate-y-0.5 hover:shadow-sm transition-all cursor-pointer text-left bg-grey-bg/25"
            >
              <span className="text-2xl bg-green-bg px-2.5 py-1.5 rounded-lg inline-block mb-3 select-none text-green-pri font-bold">📥</span>
              <h4 className="font-bold text-sm text-text-primary mb-1">CSV Import</h4>
              <p className="text-xs text-text-muted leading-relaxed">
                Ingest spreadsheets with a 20-anomaly auto-detection wizard.
              </p>
              <span className="text-[10px] font-bold text-green-pri block mt-4 hover:underline">
                Go to CSV Import →
              </span>
            </div>

            {/* Multi-Currency */}
            <div 
              onClick={() => setFeatureHelpModal('currency')}
              className="border border-border-custom p-5 rounded-xl hover:border-green-pri hover:-translate-y-0.5 hover:shadow-sm transition-all cursor-pointer text-left bg-grey-bg/25"
            >
              <span className="text-2xl bg-green-bg px-2.5 py-1.5 rounded-lg inline-block mb-3 select-none text-green-pri font-bold">💱</span>
              <h4 className="font-bold text-sm text-text-primary mb-1">Multi-Currency (INR/USD)</h4>
              <p className="text-xs text-text-muted leading-relaxed">
                Track expenses dynamically in rupees or dollars with live-like conversion.
              </p>
              <span className="text-[10px] font-bold text-green-pri block mt-4 hover:underline">
                Learn How →
              </span>
            </div>

            {/* Balances & Settle-up */}
            <div 
              onClick={handleBalancesShortcut}
              className="border border-border-custom p-5 rounded-xl hover:border-green-pri hover:-translate-y-0.5 hover:shadow-sm transition-all cursor-pointer text-left bg-grey-bg/25"
            >
              <span className="text-2xl bg-green-bg px-2.5 py-1.5 rounded-lg inline-block mb-3 select-none text-green-pri font-bold">⚖️</span>
              <h4 className="font-bold text-sm text-text-primary mb-1">Balances</h4>
              <p className="text-xs text-text-muted leading-relaxed">
                Check outstanding balances and record settlements to clear up all debt.
              </p>
              <span className="text-[10px] font-bold text-green-pri block mt-4 hover:underline">
                Focus Active Groups →
              </span>
            </div>
          </div>
        </section>
        </div>

      {/* Create Group Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs transition-opacity">
          <div className="w-full max-w-md bg-white border border-border-custom rounded-2xl shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary">Create New Group</h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setNewGroupName('');
                  setModalError('');
                }}
                className="text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-owe text-xs font-semibold">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label htmlFor="groupName" className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                  Group Name
                </label>
                <input
                  id="groupName"
                  type="text"
                  required
                  placeholder="e.g. Apartment roommates, Europe trip"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-4 py-3 bg-grey-bg border border-border-custom rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-green-pri focus:border-transparent transition-all"
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
                  className="px-4 py-2.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-grey-bg transition-all text-sm font-semibold border border-transparent cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-5 py-2.5 rounded-xl bg-green-pri hover:bg-green-light text-white disabled:opacity-50 transition-all text-sm font-bold shadow-md cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-4xl bg-white border border-border-custom rounded-2xl shadow-2xl p-6 space-y-6 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-text-primary flex items-center space-x-2">
                  <FileSpreadsheet className="h-5 w-5 text-green-pri" />
                  <span>CSV Expense Ingestion Wizard</span>
                </h3>
                <p className="text-xs text-text-muted mt-0.5 text-left font-normal">Parse, sanitise, and ingest your historical expense logs</p>
              </div>
              <button
                onClick={() => {
                  setIsCsvImportOpen(false);
                }}
                className="text-text-muted hover:text-text-primary transition-colors p-1.5 rounded-lg border border-border-custom cursor-pointer"
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

      {/* FEATURE HELP MODAL */}
      {featureHelpModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-border-custom p-6 rounded-2xl w-full max-w-md shadow-2xl relative text-left">
            <button
              onClick={() => setFeatureHelpModal(null)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary font-bold text-sm cursor-pointer"
            >
              ✕
            </button>
            
            {featureHelpModal === 'splits' && (
              <>
                <h3 className="text-lg font-extrabold text-text-primary mb-2">Smart Splits 📊</h3>
                <p className="text-xs text-text-muted leading-relaxed mb-4">
                  Expense Ledger supports four robust splitting methods when recording expenses in any group:
                </p>
                <ul className="space-y-2 text-xs text-text-primary list-disc pl-4 mb-4">
                  <li><strong>Equally</strong>: Splits the expense evenly among all checked group members.</li>
                  <li><strong>Unequally</strong>: Specify exact decimal amounts owed by each member.</li>
                  <li><strong>Percentage</strong>: Input split percentages (must sum up to exactly 100%).</li>
                  <li><strong>Shares</strong>: Specify split weight factors (e.g. Member A pays 2 parts, Member B pays 1 part).</li>
                </ul>
                <p className="text-[10px] text-text-muted">
                  These splits are calculated automatically in the expense creation sheet within your groups.
                </p>
              </>
            )}

            {featureHelpModal === 'instant' && (
              <>
                <h3 className="text-lg font-extrabold text-text-primary mb-2">Instant Simplification ⚡</h3>
                <p className="text-xs text-text-muted leading-relaxed mb-4">
                  When multiple members log expenses, debts can become complicated (e.g. A owes B, B owes C, C owes A).
                </p>
                <p className="text-xs text-text-muted leading-relaxed mb-4">
                  Our system runs a **greedy flow-simplification formula** in real-time. It calculates net balances and aggregates matching transactions, minimizing the number of paybacks required to settle the ledger.
                </p>
                <p className="text-[10px] text-text-muted">
                  You can inspect these simplified transactions at any time in the &quot;Simplified Debts&quot; column inside your groups.
                </p>
              </>
            )}

            {featureHelpModal === 'currency' && (
              <>
                <h3 className="text-lg font-extrabold text-text-primary mb-2">Multi-Currency (INR/USD) 💱</h3>
                <p className="text-xs text-text-muted leading-relaxed mb-4">
                  Expense Ledger supports tracking ledger items in multiple currencies:
                </p>
                <ul className="space-y-2 text-xs text-text-primary list-disc pl-4 mb-4">
                  <li>You can select <strong>INR (₹)</strong> or <strong>USD ($)</strong> for any expense or settlement.</li>
                  <li>All balances are kept in their native currencies so that you can settle in the correct denomination.</li>
                  <li>A consolidated aggregate is calculated at a fixed conversion rate of **1 USD = 83 INR** to show your overall net position on the dashboard.</li>
                </ul>
              </>
            )}

            <button
              onClick={() => setFeatureHelpModal(null)}
              className="w-full mt-4 py-2.5 bg-green-pri hover:bg-green-light text-white font-semibold rounded-xl transition-all cursor-pointer text-xs font-bold text-center border-none"
            >
              Got it
            </button>
          </div>
        </div>
      )}
      </div>
    </Layout>
  );
}
