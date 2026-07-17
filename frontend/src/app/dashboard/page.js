'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { fetchUserGroups, createGroup, calculateBalancesAndDebts, deleteGroup } from '@/lib/api';
import { Plus, LogOut, Users, User, ArrowUpRight, ArrowDownLeft, RefreshCw, FileSpreadsheet, Trash2, Search, Bell, Upload } from 'lucide-react';
import Link from 'next/link';
import CsvImporter from '@/components/CsvImporter';
import Layout from '@/components/Layout';

export default function Dashboard() {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();

  const [groups, setGroups] = useState([]);
  const [groupBalances, setGroupBalances] = useState({}); // groupId -> { consolidated, INR, USD, member_count }
  const [dataLoading, setDataLoading] = useState(true);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Pending settlements count state
  const [pendingSettlementsCount, setPendingSettlementsCount] = useState(0);

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
      let settlementCount = 0;
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

            // Count simplified debts for the logged-in user in this group
            if (groupData.simplifiedDebts) {
              groupData.simplifiedDebts.forEach((debt) => {
                if (debt.from === user.id || debt.to === user.id) {
                  settlementCount++;
                }
              });
            }
          } catch (err) {
            console.error(`Error calculating balance for group ${g.id}:`, err);
            balances[g.id] = { consolidated: 0, INR: 0, USD: 0, member_count: 1 };
          }
        })
      );
      setGroupBalances(balances);
      setPendingSettlementsCount(settlementCount);
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

  const handleAddExpenseClick = () => {
    if (groups.length === 0) {
      setIsModalOpen(true);
    } else {
      router.push(`/groups/${groups[0].id}?action=add-expense`);
    }
  };

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <div className="w-full flex-1 flex flex-col bg-[#f8fafc] overflow-hidden h-full">
        {/* Top Header Bar */}
        <div className="bg-white border-b border-border-custom px-8 py-4 flex justify-between items-center flex-shrink-0">
          {/* Search bar */}
          <div className="relative w-80">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search transactions or groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-[#f1f5f9] border border-transparent rounded-full text-sm text-text-primary placeholder-gray-400 focus:outline-none focus:bg-white focus:border-gray-300 transition-all text-left"
            />
          </div>

          {/* Right items */}
          <div className="flex items-center gap-4">
            <button
              onClick={loadData}
              disabled={dataLoading}
              className="p-1.5 rounded-full text-text-muted hover:text-text-primary hover:bg-gray-100 transition-all cursor-pointer border-none bg-transparent"
              title="Refresh balances"
            >
              <RefreshCw className={`h-4.5 w-4.5 ${dataLoading ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              className="p-1.5 rounded-full text-text-muted hover:text-text-primary hover:bg-gray-100 transition-all cursor-pointer relative border-none bg-transparent"
              title="Notifications"
            >
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 bg-red-500 rounded-full"></span>
            </button>

            <button
              onClick={() => {
                if (groups.length > 0) {
                  router.push(`/groups/${groups[0].id}?tab=members`);
                } else {
                  setIsModalOpen(true);
                }
              }}
              className="px-5 py-1.5 bg-[#0e5c3e] hover:bg-[#0b4a32] text-white text-xs font-bold rounded-full transition-all cursor-pointer border-none shadow-xs"
            >
              Invite Member
            </button>

            <img 
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop" 
              alt="Profile" 
              className="h-8 w-8 rounded-full object-cover border border-gray-200 shadow-xs cursor-pointer"
            />
          </div>
        </div>

        {/* Scrollable Dashboard Area */}
        <div className="page-body flex-1 space-y-6 py-8">
          
          {/* Header Title Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-left">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Financial Overview</h1>
              <p className="text-xs text-text-muted mt-1 font-semibold">
                Welcome back, {profile?.name || 'User'}. You have {pendingSettlementsCount} pending settlement{pendingSettlementsCount !== 1 ? 's' : ''}.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddExpenseClick}
                className="flex items-center gap-2 px-5 py-2.5 bg-mint-green hover:bg-[#72df9b] text-dark-green-text font-extrabold rounded-full shadow-sm transition-all cursor-pointer text-xs border-none"
              >
                <div className="flex items-center justify-center h-4.5 w-4.5 rounded-full bg-[#0e5c3e] text-white">
                  <Plus className="h-3 w-3" strokeWidth={3} />
                </div>
                <span>Add Expense</span>
              </button>
              
              <button
                onClick={() => setIsCsvImportOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 font-extrabold rounded-full shadow-sm transition-all cursor-pointer text-xs border border-gray-300"
              >
                <Upload className="h-4 w-4 text-gray-500" />
                <span>Upload CSV</span>
              </button>
            </div>
          </div>

          {/* Balance Card Section */}
          <div className="bg-white border border-border-custom rounded-2xl p-6 md:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Left Column: Overall Balance */}
            <div className="flex-1 text-left space-y-4">
              <div>
                <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Overall Balance</p>
                <div className="flex flex-col gap-1 mt-2.5">
                  <div className={`text-3xl font-extrabold tracking-tight ${
                    overallBalanceINR > 0.01 
                      ? 'text-green-owed' 
                      : overallBalanceINR < -0.01 
                      ? 'text-red-owe' 
                      : 'text-text-primary'
                  }`}>
                    ₹{overallBalanceINR.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-semibold text-text-muted">INR</span>
                  </div>
                  <div className={`text-3xl font-extrabold tracking-tight ${
                    overallBalanceUSD > 0.01 
                      ? 'text-green-owed' 
                      : overallBalanceUSD < -0.01 
                      ? 'text-red-owe' 
                      : 'text-text-primary'
                  }`}>
                    ${overallBalanceUSD.toFixed(2)} <span className="text-xs font-semibold text-text-muted">USD</span>
                  </div>
                </div>
                <p className="text-[10px] text-text-muted mt-3 font-semibold">Net balances separated by currency across all your groups.</p>
              </div>
            </div>

            {/* Vertical Line divider */}
            <div className="hidden md:block w-px bg-gray-200 self-stretch my-1"></div>

            {/* Right Column: You Are Owed / You Owe */}
            <div className="grid grid-cols-2 gap-8 md:pl-8 text-left min-w-[280px]">
              {/* You are owed */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-green-owed text-[10px] font-extrabold uppercase tracking-wider">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  <span>You are owed</span>
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-extrabold text-green-owed">₹{totalOwedINR.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  <p className="text-lg font-extrabold text-green-owed">${totalOwedUSD.toFixed(2)}</p>
                </div>
              </div>

              {/* You owe */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-red-owe text-[10px] font-extrabold uppercase tracking-wider">
                  <ArrowDownLeft className="h-3.5 w-3.5" />
                  <span>You owe</span>
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-extrabold text-red-owe">₹{totalOweINR.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  <p className="text-lg font-extrabold text-red-owe">${totalOweUSD.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Groups list title bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 text-left">
              <Users className="h-5 w-5 text-green-pri" />
              <h2 className="text-lg font-extrabold text-gray-900">Your Groups</h2>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={loadData}
                disabled={dataLoading}
                className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-white border border-gray-300 bg-white disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                title="Refresh balances"
              >
                <RefreshCw className={`h-4 w-4 ${dataLoading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={() => setIsCsvImportOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm font-bold text-xs transition-all cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 text-green-pri" />
                <span>Import CSV</span>
              </button>

              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#0e5c3e] hover:bg-[#0b4a32] text-white shadow-sm font-bold text-xs transition-all cursor-pointer border-none"
              >
                <Plus className="h-4 w-4" />
                <span>Create Group</span>
              </button>
            </div>
          </div>

          {/* Group Grid / List */}
          {dataLoading && groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 bg-white border border-border-custom rounded-2xl">
              <div className="w-6 h-6 border-2 border-green-pri border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-text-muted text-xs font-semibold">Loading groups...</p>
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 bg-white border border-border-custom rounded-2xl text-center space-y-4 shadow-xs">
              <div className="h-12 w-12 rounded-full bg-[#f1f5f9] flex items-center justify-center text-gray-400">
                <Users className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-gray-900 font-extrabold text-base">No groups yet</h3>
                <p className="text-text-muted text-xs max-w-sm mx-auto font-medium">
                  Create a group to start splitting rent, dinner, or travel bills with friends.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-6 py-2.5 rounded-full bg-mint-green hover:bg-[#72df9b] text-dark-green-text font-bold text-xs transition-all cursor-pointer border-none"
              >
                Create your first group
              </button>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 bg-white border border-border-custom rounded-2xl text-center shadow-sm">
              <p className="text-text-muted text-sm font-semibold">No groups matching &quot;{searchQuery}&quot;</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGroups.map((group) => {
                const balance = groupBalances[group.id] || { consolidated: 0, INR: 0, USD: 0, member_count: 1 };
                const inrVal = balance.INR || 0;
                const usdVal = balance.USD || 0;

                let statusText = "SETTLED UP";
                let statusBg = "bg-[#f1f5f9] text-[#6b7280]";
                
                if (balance.consolidated > 0.01) {
                  statusText = "YOU ARE OWED";
                  statusBg = "bg-[#dcfce7] text-[#15803d]";
                } else if (balance.consolidated < -0.01) {
                  statusText = "YOU OWE";
                  statusBg = "bg-[#fee2e2] text-[#b91c1c]";
                }

                const renderCardBalance = () => {
                  const hasInr = Math.abs(inrVal) > 0.01;
                  const hasUsd = Math.abs(usdVal) > 0.01;
                  
                  if (!hasInr && !hasUsd) {
                    return <p className="font-extrabold text-sm text-text-primary">$0.00</p>;
                  }
                  
                  return (
                    <div className="flex flex-col">
                      {hasInr && (
                        <p className={`font-extrabold text-sm ${inrVal > 0 ? 'text-green-owed' : 'text-red-owe'}`}>
                          {inrVal > 0 ? '+' : '-'}₹{Math.abs(inrVal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                      )}
                      {hasUsd && (
                        <p className={`font-extrabold text-sm ${usdVal > 0 ? 'text-green-owed' : 'text-red-owe'}`}>
                          {usdVal > 0 ? '+' : '-'}${Math.abs(usdVal).toFixed(2)}
                        </p>
                      )}
                    </div>
                  );
                };

                return (
                  <div key={group.id} className="relative group/card bg-white border border-border-custom hover:border-green-pri/40 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[170px]">
                    
                    {/* Top Row with Icon and Badge/Delete */}
                    <div className="flex justify-between items-start">
                      <div className="h-10 w-10 rounded-xl bg-[#e8f5e9] flex items-center justify-center text-green-pri">
                        <Users className="h-5 w-5" />
                      </div>
                      
                      <div className="absolute top-6 right-6">
                        <span className={`group-hover/card:hidden inline-block px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${statusBg}`}>
                          {statusText}
                        </span>
                        <button
                          onClick={(e) => handleDeleteGroup(e, group.id, group.name)}
                          className="group-hover/card:inline-flex hidden items-center justify-center p-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-owe hover:text-red-700 transition-all cursor-pointer"
                          title={`Delete ${group.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Group Info */}
                    <div className="mt-4 text-left">
                      <h3 className="font-extrabold text-gray-950 text-sm group-hover/card:text-green-pri transition-colors">
                        {group.name}
                      </h3>
                      <p className="text-text-muted text-[11px] mt-0.5 font-semibold">
                        {balance.member_count} member{balance.member_count !== 1 ? 's' : ''}
                      </p>
                    </div>

                    {/* Divider */}
                    <hr className="border-gray-100 my-4" />

                    {/* Bottom balance and view details */}
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">Your Balance</p>
                        <div className="mt-0.5">
                          {renderCardBalance()}
                        </div>
                      </div>
                      
                      <Link
                        href={`/groups/${group.id}`}
                        className="flex items-center gap-0.5 text-xs font-bold text-green-pri hover:text-[#0b4a32] transition-colors cursor-pointer"
                      >
                        <span>View Details</span>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Create Group Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-fade-in">
            <div className="w-full max-w-md bg-white border border-border-custom rounded-2xl shadow-2xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-text-primary">Create New Group</h3>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setNewGroupName('');
                    setModalError('');
                  }}
                  className="text-text-muted hover:text-text-primary transition-colors cursor-pointer border-none bg-transparent font-bold text-base"
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
                <div className="text-left">
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
                    className="w-full px-4 py-3 bg-grey-bg border border-border-custom rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-green-pri focus:border-transparent transition-all text-left"
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
                    className="px-4 py-2.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-grey-bg transition-all text-sm font-semibold border border-transparent cursor-pointer bg-transparent"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={modalLoading}
                    className="px-5 py-2.5 rounded-xl bg-green-pri hover:bg-green-light text-white disabled:opacity-50 transition-all text-sm font-bold shadow-md cursor-pointer border-none"
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
                <div className="text-left">
                  <h3 className="text-lg font-bold text-text-primary flex items-center space-x-2">
                    <FileSpreadsheet className="h-5 w-5 text-green-pri" />
                    <span>CSV Expense Ingestion Wizard</span>
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5 font-normal">Parse, sanitise, and ingest your historical expense logs</p>
                </div>
                <button
                  onClick={() => {
                    setIsCsvImportOpen(false);
                  }}
                  className="text-text-muted hover:text-text-primary transition-colors p-1.5 rounded-lg border border-border-custom cursor-pointer bg-transparent"
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
                className="absolute top-4 right-4 text-text-muted hover:text-text-primary font-bold text-sm cursor-pointer border-none bg-transparent"
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
